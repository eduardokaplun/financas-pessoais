'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const EMOJIS = ['🍽️','🏠','🚗','💊','📚','🎮','👕','📱','🐾','🎁','✈️','💪','🎵','🍺','💅','🛒','⚡','💧','🏥','🎓','💼','💻','📈','🏦','⭐','➕','₿','📊','🪙','💎']
const DEFAULT_CATS = [
  {nome:'Salário',emoji:'💼',tipo:'receita'},
  {nome:'Freelance',emoji:'💻',tipo:'receita'},
  {nome:'Rendimentos',emoji:'📈',tipo:'receita'},
  {nome:'Outros (entrada)',emoji:'➕',tipo:'receita'},
  {nome:'Alimentação',emoji:'🍽️',tipo:'despesa'},
  {nome:'Moradia',emoji:'🏠',tipo:'despesa'},
  {nome:'Transporte',emoji:'🚗',tipo:'despesa'},
  {nome:'Saúde',emoji:'💊',tipo:'despesa'},
  {nome:'Educação',emoji:'📚',tipo:'despesa'},
  {nome:'Lazer',emoji:'🎮',tipo:'despesa'},
  {nome:'Vestuário',emoji:'👕',tipo:'despesa'},
  {nome:'Serviços',emoji:'📱',tipo:'despesa'},
  {nome:'Pets',emoji:'🐾',tipo:'despesa'},
  {nome:'Presentes',emoji:'🎁',tipo:'despesa'},
  {nome:'Outros',emoji:'⭐',tipo:'despesa'},
  {nome:'Bitcoin (BTC)',emoji:'₿',tipo:'investimento'},
  {nome:'Ações',emoji:'📊',tipo:'investimento'},
  {nome:'Fundos',emoji:'🏦',tipo:'investimento'},
  {nome:'Poupança',emoji:'🪙',tipo:'investimento'},
  {nome:'Tesouro Direto',emoji:'💎',tipo:'investimento'},
  {nome:'Outros (invest.)',emoji:'📈',tipo:'investimento'},
]
const CAT_COLORS = {
  'Alimentação':'#16a06a','Moradia':'#2f6fed','Transporte':'#d97706',
  'Saúde':'#e03e3e','Educação':'#7c3aed','Lazer':'#db2777',
  'Vestuário':'#d97706','Serviços':'#059669','Pets':'#0891b2',
  'Presentes':'#be185d','Outros':'#6b7280',
  'Salário':'#16a06a','Freelance':'#2f6fed','Rendimentos':'#7c3aed','Outros (entrada)':'#6b7280',
  'Bitcoin (BTC)':'#f59e0b','Ações':'#10b981','Fundos':'#6366f1',
  'Poupança':'#06b6d4','Tesouro Direto':'#8b5cf6','Outros (invest.)':'#64748b',
}

function fmt(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtShort(v){if(v>=1000)return 'R$'+(v/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k';return fmt(v)}
function fmtDate(s){if(!s)return '';const[y,m,d]=s.split('-');return `${d}/${m}`}
function catColor(name){if(CAT_COLORS[name])return CAT_COLORS[name];const colors=['#16a06a','#2f6fed','#d97706','#7c3aed','#db2777','#0891b2','#be185d','#059669','#e03e3e'];let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))%colors.length;return colors[Math.abs(h)]}
function catEmoji(name,cats){const c=(cats||[]).find(c=>c.nome===name);return c?c.emoji:'📌'}

const TIPO_STYLE = {
  receita: {cls:'g', prefix:'+', label:'Receita', btnCls:'rec', icon:'💰'},
  despesa: {cls:'r', prefix:'-', label:'Despesa', btnCls:'des', icon:'💸'},
  investimento: {cls:'inv', prefix:'→', label:'Investimento', btnCls:'inv', icon:'📈'},
}

export default function Dashboard({user, onLogout}){
  const supabase = createClient()
  const [tab, setTab] = useState('inicio')
  const [lancamentos, setLancamentos] = useState([])
  const [cats, setCats] = useState([])
  const [fixos, setFixos] = useState([])
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const [curY, setCurY] = useState(now.getFullYear())
  const [curM, setCurM] = useState(now.getMonth())
  const [filter, setFilter] = useState('todos')

  // modal novo/editar
  const [modal, setModal] = useState(null) // null | 'lancamento' | 'fixo' | 'editando'
  const [editItem, setEditItem] = useState(null)
  const [tipo, setTipo] = useState('despesa')
  const [desc, setDesc] = useState('')
  const [valor, setValor] = useState('')
  const [catSel, setCatSel] = useState('')
  const [data, setData] = useState(new Date().toISOString().slice(0,10))
  const [parcOn, setParcOn] = useState(false)
  const [parcN, setParcN] = useState('')
  const [saving, setSaving] = useState(false)

  // fixo form
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fCat, setFCat] = useState('')
  const [fTipo, setFTipo] = useState('despesa')
  const [fDia, setFDia] = useState('1')

  // cat form
  const [newCatNome, setNewCatNome] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('⭐')
  const [newCatTipo, setNewCatTipo] = useState('despesa')

  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  function showToast(msg){setToastMsg(msg);setToastVisible(true);setTimeout(()=>setToastVisible(false),2500)}

  const load = useCallback(async()=>{
    if(!user||!user.id)return
    setLoading(true)
    const [l,c,f] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('user_id',user.id).order('data',{ascending:false}),
      supabase.from('categorias').select('*').eq('user_id',user.id).order('criado_em'),
      supabase.from('fixos').select('*').eq('user_id',user.id).order('criado_em'),
    ])
    setLancamentos(l.data||[])
    let catsData = c.data||[]
    if(catsData.length===0){
      const toInsert = DEFAULT_CATS.map(d=>({...d,user_id:user.id}))
      const {data:inserted} = await supabase.from('categorias').insert(toInsert).select()
      catsData = inserted||DEFAULT_CATS
    }
    setCats(catsData)
    setFixos(f.data||[])
    setLoading(false)
  },[user])

  useEffect(()=>{if(user&&user.id)load()},[load,user])

  const monthKey = `${curY}-${String(curM+1).padStart(2,'0')}`
  const monthItems = lancamentos.filter(d=>d.data&&d.data.startsWith(monthKey))
  const fixosAtivos = fixos.filter(f=>f.ativo)
  const fixosVirtuais = fixosAtivos.map(f=>({
    id:'fixo_'+f.id, descricao:f.descricao, valor:f.valor,
    tipo:f.tipo, categoria:f.categoria, data:`${monthKey}-${String(f.dia_vencimento).padStart(2,'0')}`,
    isFixo:true, fixoId:f.id
  }))
  const fixoIdsThisMonth = new Set(monthItems.filter(l=>l.fixo_id).map(l=>l.fixo_id))
  const pendingFixos = fixosVirtuais.filter(f=>!fixoIdsThisMonth.has(f.fixoId))
  const allMonthItems = [...monthItems,...pendingFixos]

  const rec = allMonthItems.filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0)
  const desp = allMonthItems.filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0)
  const inv = allMonthItems.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0)
  const saldo = rec - desp - inv

  function prevMonth(){if(curM===0){setCurM(11);setCurY(y=>y-1)}else setCurM(m=>m-1)}
  function nextMonth(){if(curM===11){setCurM(0);setCurY(y=>y+1)}else setCurM(m=>m+1)}

  function openModal(type){
    setModal(type)
    setEditItem(null)
    if(type==='lancamento'){
      setTipo('despesa')
      const dc=cats.find(c=>c.tipo==='despesa')
      setCatSel(dc?.nome||'')
      setData(new Date().toISOString().slice(0,10))
      setParcOn(false);setParcN('')
    }
    if(type==='fixo'){
      setFTipo('despesa')
      const dc=cats.find(c=>c.tipo==='despesa')
      setFCat(dc?.nome||'')
    }
  }

  function openEdit(item){
    setEditItem(item)
    setTipo(item.tipo||'despesa')
    setDesc(item.descricao||'')
    setValor(String(item.valor||''))
    setCatSel(item.categoria||'')
    setData(item.data||new Date().toISOString().slice(0,10))
    setParcOn(false);setParcN('')
    setModal('editando')
  }

  function changeTipo(t){
    setTipo(t)
    const dc=cats.find(c=>c.tipo===t)
    setCatSel(dc?.nome||'')
  }

  function changeFTipo(t){
    setFTipo(t)
    const dc=cats.find(c=>c.tipo===t)
    setFCat(dc?.nome||'')
  }

  async function addLancamento(){
    if(!desc||!valor||Number(valor)<=0||!data){showToast('⚠️ Preencha todos os campos!');return}
    if(!user||!user.id)return
    setSaving(true)
    if(parcOn&&Number(parcN)>=2){
      const total=Number(parcN)
      const parcVal=parseFloat((Number(valor)/total).toFixed(2))
      const parcId='parc_'+Date.now()
      const [y,m,d2]=data.split('-').map(Number)
      const rows=[]
      for(let i=0;i<total;i++){
        let pm=m-1+i,py=y
        while(pm>=12){pm-=12;py++}
        rows.push({user_id:user.id,descricao:desc,valor:parcVal,tipo,categoria:catSel,data:`${py}-${String(pm+1).padStart(2,'0')}-${String(d2).padStart(2,'0')}`,parc_id:parcId,parc_n:i+1,parc_total:total})
      }
      await supabase.from('lancamentos').insert(rows)
      showToast(`✅ ${total} parcelas lançadas!`)
    }else{
      await supabase.from('lancamentos').insert([{user_id:user.id,descricao:desc,valor:Number(valor),tipo,categoria:catSel,data}])
      showToast(TIPO_STYLE[tipo]?.icon+' Salvo!')
    }
    setDesc('');setValor('');setParcOn(false);setParcN('')
    setModal(null);setSaving(false);load()
  }

  async function saveEdit(){
    if(!desc||!valor||Number(valor)<=0||!data){showToast('⚠️ Preencha todos os campos!');return}
    setSaving(true)
    await supabase.from('lancamentos').update({
      descricao:desc, valor:Number(valor), tipo, categoria:catSel, data
    }).eq('id',editItem.id)
    showToast('✅ Lançamento atualizado!')
    setModal(null);setSaving(false);load()
  }

  async function addFixo(){
    if(!fDesc||!fValor||Number(fValor)<=0){showToast('⚠️ Preencha todos os campos!');return}
    if(!user||!user.id)return
    setSaving(true)
    await supabase.from('fixos').insert([{user_id:user.id,descricao:fDesc,valor:Number(fValor),tipo:fTipo,categoria:fCat,dia_vencimento:Number(fDia)}])
    setFDesc('');setFValor('');setModal(null);setSaving(false)
    showToast('✅ Fixo adicionado!');load()
  }

  async function toggleFixo(id,ativo){await supabase.from('fixos').update({ativo:!ativo}).eq('id',id);load()}

  async function delLancamento(item){
    if(item.parc_id){
      const all=lancamentos.filter(l=>l.parc_id===item.parc_id)
      if(window.confirm(`Remover só esta parcela ou TODAS (${all.length})?`)){
        if(window.confirm('OK = remover TODAS, Cancelar = só esta')){
          await supabase.from('lancamentos').delete().eq('parc_id',item.parc_id)
          showToast('🗑️ Todas as parcelas removidas.')
        }else{
          await supabase.from('lancamentos').delete().eq('id',item.id)
          showToast('🗑️ Parcela removida.')
        }
      }
    }else{
      if(!window.confirm('Remover este lançamento?'))return
      await supabase.from('lancamentos').delete().eq('id',item.id)
      showToast('🗑️ Removido.')
    }
    load()
  }

  async function delFixo(id){
    if(!window.confirm('Remover este fixo?'))return
    await supabase.from('fixos').delete().eq('id',id)
    showToast('🗑️ Fixo removido.');load()
  }

  async function addCat(){
    if(!newCatNome){showToast('⚠️ Digite o nome!');return}
    if(!user||!user.id)return
    await supabase.from('categorias').insert([{user_id:user.id,nome:newCatNome,emoji:newCatEmoji,tipo:newCatTipo}])
    setNewCatNome('');showToast('✅ Categoria adicionada!');load()
  }

  async function delCat(id,nome){
    if(!window.confirm(`Remover a categoria "${nome}"?`))return
    await supabase.from('categorias').delete().eq('id',id)
    showToast('🗑️ Categoria removida.');load()
  }

  async function logout(){await supabase.auth.signOut();onLogout()}

  function exportData(){
    const payload=JSON.stringify({exportedAt:new Date().toISOString(),lancamentos,fixos,cats},null,2)
    const blob=new Blob([payload],{type:'application/json'})
    const url=URL.createObjectURL(blob)
    const a=document.createElement('a')
    a.href=url;a.download=`financas_backup_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`;a.click()
    URL.revokeObjectURL(url);showToast('📁 Backup exportado!')
  }

  function renderBars(items,total){
    const catMap={}
    items.filter(d=>d.tipo==='despesa').forEach(d=>{catMap[d.categoria]=(catMap[d.categoria]||0)+Number(d.valor||0)})
    const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1])
    const maxV=sorted.length?sorted[0][1]:1
    if(!sorted.length)return <div className="empty"><span className="ei">📭</span>Nenhuma despesa neste mês</div>
    return sorted.map(([cat,val])=>(
      <div className="bar-row" key={cat}>
        <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{total?` · ${Math.round(val/total*100)}%`:''}</span></div>
        <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/maxV*100)}%`,background:catColor(cat)}}></div></div>
      </div>
    ))
  }

  function ItemRow({item,showDel=false}){
    const isParc=!!item.parc_id
    const isFixo=!!item.isFixo
    const tipoInfo=TIPO_STYLE[item.tipo]||TIPO_STYLE.despesa
    return(
      <div className="item">
        <div className={`item-ico ${tipoInfo.cls}`}>{catEmoji(item.categoria,cats)}</div>
        <div className="item-info">
          <div className="item-desc">
            {item.descricao}
            {isParc&&<span className="badge badge-parc">{item.parc_n}/{item.parc_total}</span>}
            {isFixo&&<span className="badge badge-fixo">fixo</span>}
            {item.tipo==='investimento'&&<span className="badge badge-inv">invest.</span>}
          </div>
          <div className="item-sub">{item.categoria} · {fmtDate(item.data)}</div>
        </div>
        <div className="item-right">
          <div className={`item-val ${tipoInfo.cls}`}>{tipoInfo.prefix}{fmt(item.valor)}</div>
        </div>
        {showDel&&!isFixo&&(
          <div style={{display:'flex',gap:4}}>
            <button className="del-btn" onClick={()=>openEdit(item)} title="Editar" style={{fontSize:16}}>✏️</button>
            <button className="del-btn" onClick={()=>delLancamento(item)}>×</button>
          </div>
        )}
      </div>
    )
  }

  const filteredItems=(()=>{
    if(filter==='todos')return allMonthItems
    if(filter==='receita')return allMonthItems.filter(d=>d.tipo==='receita')
    if(filter==='despesa')return allMonthItems.filter(d=>d.tipo==='despesa')
    if(filter==='investimento')return allMonthItems.filter(d=>d.tipo==='investimento')
    if(filter==='parcelas')return monthItems.filter(d=>d.parc_id)
    if(filter==='fixos')return [...monthItems.filter(d=>d.fixo_id),...pendingFixos]
    return allMonthItems
  })()

  function trendData(){
    const result=[]
    for(let i=5;i>=0;i--){
      let y=curY,m=curM-i
      while(m<0){m+=12;y--}
      const key=`${y}-${String(m+1).padStart(2,'0')}`
      const its=lancamentos.filter(d=>d.data&&d.data.startsWith(key))
      const r=its.filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0)
      const dp=its.filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0)
      const iv=its.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0)
      result.push({label:MONTHS[m].slice(0,3),rec:r,desp:dp,inv:iv})
    }
    return result
  }

  if(!user)return<div className="loading">Carregando...</div>
  if(loading)return<div className="loading">Carregando seus dados...</div>

  const modalCats=cats.filter(c=>c.tipo===tipo)
  const modalFixoCats=cats.filter(c=>c.tipo===fTipo)
  const trend=trendData()
  const maxTrend=Math.max(...trend.map(x=>Math.max(x.rec,x.desp,x.inv)),1)
  const allDes=lancamentos.filter(d=>d.tipo==='despesa')
  const allRec=lancamentos.filter(d=>d.tipo==='receita')
  const allInv=lancamentos.filter(d=>d.tipo==='investimento')
  const catMapAll={};allDes.forEach(d=>{catMapAll[d.categoria]=(catMapAll[d.categoria]||0)+Number(d.valor||0)})
  const catsAll=Object.entries(catMapAll).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const totalAllDesp=allDes.reduce((s,d)=>s+Number(d.valor||0),0)
  const totalAllInv=allInv.reduce((s,d)=>s+Number(d.valor||0),0)
  const maxAllCat=catsAll.length?catsAll[0][1]:1
  const meses=new Set(lancamentos.map(d=>d.data?.slice(0,7))).size
  const mrec=allRec.length?allRec.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allRec[0]):null
  const mdes=allDes.length?allDes.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allDes[0]):null
  const today=new Date().toISOString().slice(0,10)
  const parcIds=new Set(lancamentos.filter(d=>d.parc_id&&d.data>=today).map(d=>d.parc_id))
  const parcelasAtivas=[...parcIds].map(pid=>{
    const all=lancamentos.filter(d=>d.parc_id===pid).sort((a,b)=>a.data.localeCompare(b.data))
    const future=all.filter(d=>d.data>=today)
    const first=all[0]
    const totalVal=all.reduce((s,d)=>s+Number(d.valor||0),0)
    const remaining=future.reduce((s,d)=>s+Number(d.valor||0),0)
    return{pid,first,future,all,totalVal,remaining}
  })

  // modal form shared
  const ModalForm = ({isEdit}) => (
    <>
      <div className="modal-handle"></div>
      <div className="modal-title">{isEdit?'Editar lançamento':'Novo lançamento'}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderRadius:'var(--rads)',overflow:'hidden',border:'1px solid var(--border)',marginBottom:12}}>
        {['receita','despesa','investimento'].map(t=>(
          <button key={t} className={`tipo-btn${tipo===t?' on-'+t:''}`} onClick={()=>changeTipo(t)}>
            {TIPO_STYLE[t].icon} {TIPO_STYLE[t].label}
          </button>
        ))}
      </div>
      <div className="form-card">
        <div className="ff"><label>O quê</label><input placeholder="ex: biscoito, Bitcoin..." value={desc} onChange={e=>setDesc(e.target.value)}/></div>
        <div className="ff"><label>Valor R$</label><input type="number" inputMode="decimal" placeholder="0,00" value={valor} onChange={e=>setValor(e.target.value)}/></div>
        <div className="ff"><label>Categoria</label>
          <select value={catSel} onChange={e=>setCatSel(e.target.value)}>
            {modalCats.map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}
          </select>
        </div>
        <div className="ff"><label>Data</label><input type="date" value={data} onChange={e=>setData(e.target.value)}/></div>
      </div>
      {!isEdit&&(
        <div style={{background:'var(--bg)',borderRadius:'var(--rads)',border:'1px solid var(--border)',marginBottom:12,overflow:'hidden'}}>
          <div className="ff" style={{cursor:'pointer'}} onClick={()=>setParcOn(p=>!p)}>
            <label style={{cursor:'pointer',flex:1,color:'var(--t2)'}}>🔄 Compra parcelada?</label>
            <span style={{fontSize:13,color:'var(--t3)'}}>{parcOn?'Sim':'Não'}</span>
            <span style={{color:'var(--t3)',marginLeft:6}}>›</span>
          </div>
          {parcOn&&(
            <div className="ff" style={{borderTop:'1px solid var(--border)'}}>
              <label>Parcelas</label>
              <input type="number" inputMode="numeric" placeholder="ex: 12" min="2" max="60" value={parcN} onChange={e=>setParcN(e.target.value)} style={{fontFamily:'DM Mono,monospace'}}/>
            </div>
          )}
        </div>
      )}
      <button
        className={`save-btn ${tipo==='receita'?'rec':tipo==='investimento'?'inv-btn':'des'}`}
        onClick={isEdit?saveEdit:addLancamento}
        disabled={saving}
      >
        {saving?'Salvando...':isEdit?'✅ Salvar alterações':`${TIPO_STYLE[tipo].icon} Salvar ${TIPO_STYLE[tipo].label.toLowerCase()}`}
      </button>
    </>
  )

  return(
    <>
      <div className="tabs">
        <div className="tab-nav">
          {[['inicio','🏠','Início'],['lancamentos','📋','Lançamentos'],['relatorio','📊','Relatório'],['fixos','🔄','Fixos'],['config','⚙️','Config']].map(([id,icon,label])=>(
            <button key={id} className={`tab-btn${tab===id?' on':''}`} onClick={()=>setTab(id)}>
              <span className="ticon">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {/* INÍCIO */}
      <div className={`page${tab==='inicio'?' on':''}`}>
        <div className="month-nav">
          <button className="mnav-btn" onClick={prevMonth}>‹</button>
          <div className="mnav-label">{MONTHS[curM]} {curY}</div>
          <button className="mnav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="hero">
          <div className="hero-label">Saldo do mês</div>
          <div className={`hero-val${saldo>0?' pos':saldo<0?' neg':' zero'}`}>{fmt(saldo)}</div>
        </div>
        <div className="metrics">
          <div className="metric"><div className="metric-label">Receitas</div><div className="metric-val g">{fmt(rec)}</div></div>
          <div className="metric"><div className="metric-label">Despesas</div><div className="metric-val r">{fmt(desp)}</div></div>
        </div>
        {inv>0&&(
          <div style={{margin:'0 20px 12px'}}>
            <div className="card" style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div className="item-ico inv" style={{width:32,height:32,fontSize:15}}>📈</div>
                <div>
                  <div style={{fontSize:13,fontWeight:500}}>Investimentos do mês</div>
                  <div style={{fontSize:11,color:'var(--t3)'}}>Não contabilizado nas despesas</div>
                </div>
              </div>
              <div className="item-val inv">{fmt(inv)}</div>
            </div>
          </div>
        )}
        {fixosAtivos.length>0&&(
          <div className="sec">
            <div className="sec-title">Fixos do mês ({fixosAtivos.length})</div>
            <div className="card">
              {fixosAtivos.map(f=>(
                <div className="item" key={f.id}>
                  <div className="item-ico y">{catEmoji(f.categoria,cats)}</div>
                  <div className="item-info">
                    <div className="item-desc">{f.descricao}<span className="badge badge-fixo">fixo</span></div>
                    <div className="item-sub">{f.categoria} · todo dia {f.dia_vencimento}</div>
                  </div>
                  <div className="item-right"><div className="item-val r">-{fmt(f.valor)}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sec">
          <div className="sec-title">Onde está indo o dinheiro</div>
          <div className="card">{renderBars(allMonthItems,desp)}</div>
        </div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Últimos lançamentos</div>
          <div className="card">
            {[...monthItems].slice(0,5).map(item=><ItemRow key={item.id} item={item}/>)}
            {monthItems.length===0&&<div className="empty"><span className="ei">📭</span>Toque em + para adicionar</div>}
          </div>
        </div>
      </div>

      {/* LANÇAMENTOS */}
      <div className={`page${tab==='lancamentos'?' on':''}`}>
        <div className="month-nav">
          <button className="mnav-btn" onClick={prevMonth}>‹</button>
          <div className="mnav-label">{MONTHS[curM]} {curY}</div>
          <button className="mnav-btn" onClick={nextMonth}>›</button>
        </div>
        <div className="filters">
          {[['todos','Todos'],['receita','Receitas'],['despesa','Despesas'],['investimento','Invest.'],['parcelas','Parcelas'],['fixos','Fixos']].map(([f,label])=>(
            <div key={f} className={`chip${filter===f?' on':''}`} onClick={()=>setFilter(f)}>{label}</div>
          ))}
        </div>
        <div className="sec" style={{marginTop:4}}>
          <div className="card">
            {filteredItems.length===0&&<div className="empty"><span className="ei">📭</span>Nenhum lançamento aqui</div>}
            {[...filteredItems].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(item=><ItemRow key={item.id} item={item} showDel={true}/>)}
          </div>
        </div>
      </div>

      {/* RELATÓRIO */}
      <div className={`page${tab==='relatorio'?' on':''}`}>
        <div style={{padding:'16px 20px 4px'}}>
          <div style={{fontSize:18,fontWeight:600}}>Relatório geral</div>
          <div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>Todos os meses registrados</div>
        </div>
        <div className="rel-grid">
          <div className="rel-card"><div className="rel-label">Total registros</div><div className="rel-val">{lancamentos.length}</div></div>
          <div className="rel-card"><div className="rel-label">Meses ativos</div><div className="rel-val">{meses}</div></div>
          <div className="rel-card"><div className="rel-label">Maior receita</div><div className="rel-val g">{mrec?fmt(mrec.valor):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Maior despesa</div><div className="rel-val r">{mdes?fmt(mdes.valor):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Média rec./mês</div><div className="rel-val g">{meses?fmt(allRec.reduce((s,d)=>s+Number(d.valor||0),0)/meses):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Total investido</div><div className="rel-val inv">{fmt(totalAllInv)}</div></div>
        </div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Evolução (últimos 6 meses)</div>
          <div className="card">
            {trend.map((x,i)=>(
              <div className="trend-row" key={i}>
                <div className="trend-month">{x.label}</div>
                <div className="trend-bars">
                  <div className="trend-bar-g" style={{width:`${Math.round(x.rec/maxTrend*100)}%`}}></div>
                  <div className="trend-bar-r" style={{width:`${Math.round(x.desp/maxTrend*100)}%`}}></div>
                  {x.inv>0&&<div style={{height:5,borderRadius:3,background:'#f59e0b',width:`${Math.round(x.inv/maxTrend*100)}%`,minWidth:2,transition:'width .5s'}}></div>}
                </div>
                <div className="trend-vals">
                  <span style={{color:'var(--g)'}}>{fmtShort(x.rec)}</span> / <span style={{color:'var(--r)'}}>{fmtShort(x.desp)}</span>
                  {x.inv>0&&<><br/><span style={{color:'#f59e0b',fontSize:10}}>inv: {fmtShort(x.inv)}</span></>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Top categorias despesas (geral)</div>
          <div className="card">
            {catsAll.length===0&&<div className="empty">Nenhuma despesa registrada</div>}
            {catsAll.map(([cat,val])=>(
              <div className="bar-row" key={cat}>
                <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totalAllDesp?` · ${Math.round(val/totalAllDesp*100)}%`:''}</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/maxAllCat*100)}%`,background:catColor(cat)}}></div></div>
              </div>
            ))}
          </div>
        </div>
        {allInv.length>0&&(
          <div className="sec" style={{marginTop:16}}>
            <div className="sec-title">Investimentos por categoria</div>
            <div className="card">
              {(()=>{
                const invMap={};allInv.forEach(d=>{invMap[d.categoria]=(invMap[d.categoria]||0)+Number(d.valor||0)})
                const invCats=Object.entries(invMap).sort((a,b)=>b[1]-a[1])
                const maxInv=invCats.length?invCats[0][1]:1
                return invCats.map(([cat,val])=>(
                  <div className="bar-row" key={cat}>
                    <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totalAllInv?` · ${Math.round(val/totalAllInv*100)}%`:''}</span></div>
                    <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/maxInv*100)}%`,background:catColor(cat)}}></div></div>
                  </div>
                ))
              })()}
            </div>
          </div>
        )}
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Parcelas ativas</div>
          <div className="card">
            {parcelasAtivas.length===0&&<div className="empty">Nenhuma parcela futura</div>}
            {parcelasAtivas.map(({pid,first,future,all,totalVal,remaining})=>(
              <div className="item" key={pid}>
                <div className="item-ico p">🔄</div>
                <div className="item-info">
                  <div className="item-desc">{first?.descricao}<span className="badge badge-parc">{all.length-future.length}/{all.length}</span></div>
                  <div className="item-sub">{first?.categoria} · {future.length} parcela(s) restante(s)</div>
                </div>
                <div className="item-right">
                  <div className="item-val p">-{fmt(remaining)}</div>
                  <div className="item-sub2">total -{fmt(totalVal)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FIXOS */}
      <div className={`page${tab==='fixos'?' on':''}`}>
        <div style={{padding:'16px 20px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:18,fontWeight:600}}>Custos fixos</div>
            <div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>Aparecem automaticamente todo mês</div>
          </div>
          <button style={{padding:'9px 16px',fontSize:14,fontWeight:600,border:'none',borderRadius:'var(--rads)',background:'var(--t1)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}} onClick={()=>openModal('fixo')}>+ Novo</button>
        </div>
        <div className="sec" style={{marginTop:12}}>
          <div className="sec-title">Total fixo mensal: {fmt(fixosAtivos.reduce((s,f)=>f.tipo==='despesa'?s+Number(f.valor||0):s,0))}</div>
          <div className="card">
            {fixos.length===0&&<div className="empty"><span className="ei">🔄</span>Nenhum custo fixo cadastrado.<br/>Adicione aluguel, plano de saúde, etc.</div>}
            {fixos.map(f=>(
              <div className="fixo-item" key={f.id}>
                <div className={`item-ico ${f.tipo==='receita'?'g':f.tipo==='investimento'?'inv':'y'}`}>{catEmoji(f.categoria,cats)}</div>
                <div className="item-info">
                  <div className="item-desc">{f.descricao}</div>
                  <div className="item-sub">{f.categoria} · todo dia {f.dia_vencimento} · {fmt(f.valor)}</div>
                </div>
                <label className="fixo-toggle">
                  <input type="checkbox" checked={!!f.ativo} onChange={()=>toggleFixo(f.id,f.ativo)}/>
                  <span className="fixo-slider"></span>
                </label>
                <button className="del-btn" onClick={()=>delFixo(f.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CONFIG */}
      <div className={`page${tab==='config'?' on':''}`}>
        <div style={{padding:'16px 20px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{fontSize:18,fontWeight:600}}>Configurações</div>
          <button style={{padding:'8px 14px',fontSize:13,border:'1px solid var(--border)',borderRadius:'var(--rads)',background:'var(--card)',cursor:'pointer',color:'var(--t2)',fontFamily:'inherit'}} onClick={logout}>Sair</button>
        </div>
        <div style={{padding:'4px 20px 0',fontSize:13,color:'var(--t3)'}}>{user?.email}</div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Minhas categorias</div>
          <div className="cat-form">
            <input placeholder="Nome da categoria" value={newCatNome} onChange={e=>setNewCatNome(e.target.value)} maxLength={30}/>
            <select value={newCatEmoji} onChange={e=>setNewCatEmoji(e.target.value)}>
              {EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
            <select value={newCatTipo} onChange={e=>setNewCatTipo(e.target.value)}>
              <option value="despesa">Saída</option>
              <option value="receita">Entrada</option>
              <option value="investimento">Investimento</option>
            </select>
            <button onClick={addCat}>+ Adicionar</button>
          </div>
          <div className="card">
            {cats.map(c=>(
              <div className="item" key={c.id||c.nome}>
                <div style={{fontSize:22,width:32,textAlign:'center'}}>{c.emoji}</div>
                <div className="item-info">
                  <div className="item-desc">{c.nome}</div>
                  <div className="item-sub">{c.tipo==='receita'?'Entrada':c.tipo==='investimento'?'Investimento':'Saída'}</div>
                </div>
                {c.id&&<button className="del-btn" onClick={()=>delCat(c.id,c.nome)}>×</button>}
              </div>
            ))}
          </div>
        </div>
        <div className="sec" style={{marginTop:20}}>
          <div className="sec-title">Backup</div>
          <div className="bk-tip"><span>💡</span><span>Seus dados ficam salvos na nuvem automaticamente. O backup é uma camada extra de segurança.</span></div>
          <div className="bk-grid">
            <button className="bk-btn pri" onClick={exportData}><span className="bi">📤</span>Exportar JSON</button>
            <button className="bk-btn" style={{background:'var(--r)',color:'#fff',borderColor:'var(--r)'}} onClick={async()=>{if(window.confirm('Apagar TODOS os dados permanentemente?')){await supabase.from('lancamentos').delete().eq('user_id',user.id);load();showToast('🗑️ Dados apagados.')}}}>
              <span className="bi">🗑️</span>Apagar tudo
            </button>
          </div>
        </div>
      </div>

      <button className="fab" onClick={()=>openModal('lancamento')}>+</button>
      <div className={`toast${toastVisible?' show':''}`}>{toastMsg}</div>

      {/* MODAL NOVO / EDITAR */}
      {(modal==='lancamento'||modal==='editando')&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal"><ModalForm isEdit={modal==='editando'}/></div>
        </div>
      )}

      {/* MODAL FIXO */}
      {modal==='fixo'&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal">
            <div className="modal-handle"></div>
            <div className="modal-title">Novo custo fixo</div>
            <div style={{fontSize:13,color:'var(--t2)',marginBottom:16,lineHeight:1.5}}>Aparece automaticamente todo mês no seu painel.</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderRadius:'var(--rads)',overflow:'hidden',border:'1px solid var(--border)',marginBottom:12}}>
              {['receita','despesa','investimento'].map(t=>(
                <button key={t} className={`tipo-btn${fTipo===t?' on-'+t:''}`} onClick={()=>changeFTipo(t)}>
                  {TIPO_STYLE[t].icon} {TIPO_STYLE[t].label}
                </button>
              ))}
            </div>
            <div className="form-card">
              <div className="ff"><label>Nome</label><input placeholder="ex: Plano de saúde" value={fDesc} onChange={e=>setFDesc(e.target.value)}/></div>
              <div className="ff"><label>Valor R$</label><input type="number" inputMode="decimal" placeholder="0,00" value={fValor} onChange={e=>setFValor(e.target.value)}/></div>
              <div className="ff"><label>Categoria</label>
                <select value={fCat} onChange={e=>setFCat(e.target.value)}>
                  {modalFixoCats.map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}
                </select>
              </div>
              <div className="ff"><label>Dia do mês</label>
                <select value={fDia} onChange={e=>setFDia(e.target.value)}>
                  {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}
                </select>
              </div>
            </div>
            <button className={`save-btn ${fTipo==='receita'?'rec':fTipo==='investimento'?'inv-btn':'des'}`} onClick={addFixo} disabled={saving}>
              {saving?'Salvando...':'✅ Salvar fixo'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
