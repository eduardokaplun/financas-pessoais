'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const EMOJIS = ['🍽️','🏠','🚗','💊','📚','🎮','👕','📱','🐾','🎁','✈️','💪','🎵','🍺','💅','🛒','⚡','💧','🏥','🎓','💼','💻','📈','🏦','⭐','➕','₿','📊','🪙','💎','🏗️','🌾']
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
  {nome:'Criptomoedas',emoji:'🪙',tipo:'investimento'},
  {nome:'Ações',emoji:'📊',tipo:'investimento'},
  {nome:'Fundos',emoji:'🏦',tipo:'investimento'},
  {nome:'Tesouro Direto',emoji:'💎',tipo:'investimento'},
  {nome:'Renda Fixa',emoji:'🏗️',tipo:'investimento'},
  {nome:'Poupança',emoji:'💰',tipo:'investimento'},
  {nome:'Outros (invest.)',emoji:'📈',tipo:'investimento'},
]
const CAT_COLORS = {
  'Alimentação':'#16a06a','Moradia':'#2f6fed','Transporte':'#d97706',
  'Saúde':'#e03e3e','Educação':'#7c3aed','Lazer':'#db2777',
  'Vestuário':'#ea580c','Serviços':'#059669','Pets':'#0891b2',
  'Presentes':'#be185d','Outros':'#6b7280',
  'Salário':'#16a06a','Freelance':'#2f6fed','Rendimentos':'#7c3aed','Outros (entrada)':'#6b7280',
  'Bitcoin (BTC)':'#f59e0b','Criptomoedas':'#f97316','Ações':'#10b981',
  'Fundos':'#6366f1','Tesouro Direto':'#8b5cf6','Renda Fixa':'#06b6d4',
  'Poupança':'#14b8a6','Outros (invest.)':'#64748b',
}
const TIPO_INFO = {
  receita:      {cls:'g',   prefix:'+', label:'Receita',      icon:'💰', btnCls:'rec'},
  despesa:      {cls:'r',   prefix:'-', label:'Despesa',      icon:'💸', btnCls:'des'},
  investimento: {cls:'inv', prefix:'→', label:'Investimento', icon:'📈', btnCls:'inv-btn'},
}

function fmt(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtShort(v){if(v>=1000)return 'R$'+(v/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k';return fmt(v)}
function fmtDate(s){if(!s)return '';const[,m,d]=s.split('-');return `${d}/${m}`}
function catColor(name){return CAT_COLORS[name]||(()=>{const c=['#16a06a','#2f6fed','#d97706','#7c3aed','#db2777','#0891b2','#be185d','#059669','#e03e3e'];let h=0;for(let i=0;i<name.length;i++)h=(h*31+name.charCodeAt(i))%c.length;return c[Math.abs(h)]})()}
function catEmoji(name,cats){return (cats||[]).find(c=>c.nome===name)?.emoji||'📌'}

export default function Dashboard({user,onLogout}){
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
  const [toastMsg, setToastMsg] = useState('')
  const [toastVisible, setToastVisible] = useState(false)

  // Modal state
  const [modal, setModal] = useState(null) // null | 'lancamento' | 'editando' | 'fixo'
  const [editId, setEditId] = useState(null)
  const [mTipo, setMTipo] = useState('despesa')
  const [mDesc, setMDesc] = useState('')
  const [mValor, setMValor] = useState('')
  const [mCat, setMCat] = useState('')
  const [mData, setMData] = useState(new Date().toISOString().slice(0,10))
  const [mParcOn, setMParcOn] = useState(false)
  const [mParcN, setMParcN] = useState('')
  const [saving, setSaving] = useState(false)

  // Fixo form
  const [fDesc, setFDesc] = useState('')
  const [fValor, setFValor] = useState('')
  const [fCat, setFCat] = useState('')
  const [fTipo, setFTipo] = useState('despesa')
  const [fDia, setFDia] = useState('1')

  // Cat form
  const [newCatNome, setNewCatNome] = useState('')
  const [newCatEmoji, setNewCatEmoji] = useState('⭐')
  const [newCatTipo, setNewCatTipo] = useState('despesa')

  function showToast(msg){setToastMsg(msg);setToastVisible(true);setTimeout(()=>setToastVisible(false),2500)}

  const load = useCallback(async()=>{
    if(!user?.id)return
    setLoading(true)
    const [l,c,f] = await Promise.all([
      supabase.from('lancamentos').select('*').eq('user_id',user.id).order('data',{ascending:false}),
      supabase.from('categorias').select('*').eq('user_id',user.id).order('criado_em'),
      supabase.from('fixos').select('*').eq('user_id',user.id).order('criado_em'),
    ])
    setLancamentos(l.data||[])
    let cd = c.data||[]
    if(cd.length===0){
      const {data:ins} = await supabase.from('categorias').insert(DEFAULT_CATS.map(d=>({...d,user_id:user.id}))).select()
      cd = ins||DEFAULT_CATS
    } else {
      // Add missing investment categories
      const existing = new Set(cd.map(c=>c.nome))
      const missing = DEFAULT_CATS.filter(d=>d.tipo==='investimento'&&!existing.has(d.nome))
      if(missing.length>0){
        const {data:ins2} = await supabase.from('categorias').insert(missing.map(d=>({...d,user_id:user.id}))).select()
        cd = [...cd,...(ins2||[])]
      }
    }
    setCats(cd)
    setFixos(f.data||[])
    setLoading(false)
  },[user])

  useEffect(()=>{if(user?.id)load()},[load,user])

  const monthKey = `${curY}-${String(curM+1).padStart(2,'0')}`
  const monthItems = lancamentos.filter(d=>d.data?.startsWith(monthKey))
  const fixosAtivos = fixos.filter(f=>f.ativo)
  const pendingFixos = fixosAtivos
    .filter(f=>!monthItems.find(l=>l.fixo_id===f.id))
    .map(f=>({id:'fixo_'+f.id,descricao:f.descricao,valor:f.valor,tipo:f.tipo,categoria:f.categoria,data:`${monthKey}-${String(f.dia_vencimento).padStart(2,'0')}`,isFixo:true,fixoId:f.id}))
  const allMonthItems = [...monthItems,...pendingFixos]

  const rec  = allMonthItems.filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0)
  const desp = allMonthItems.filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0)
  const inv  = allMonthItems.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0)
  const saldo = rec - desp - inv

  function prevMonth(){if(curM===0){setCurM(11);setCurY(y=>y-1)}else setCurM(m=>m-1)}
  function nextMonth(){if(curM===11){setCurM(0);setCurY(y=>y+1)}else setCurM(m=>m+1)}

  function changeMTipo(t){
    setMTipo(t)
    const dc=cats.find(c=>c.tipo===t)
    setMCat(dc?.nome||'')
  }

  function openNew(){
    setModal('lancamento');setEditId(null)
    setMTipo('despesa');setMDesc('');setMValor('')
    const dc=cats.find(c=>c.tipo==='despesa')
    setMCat(dc?.nome||'')
    setMData(new Date().toISOString().slice(0,10))
    setMParcOn(false);setMParcN('')
  }

  function openEdit(item){
    setModal('editando');setEditId(item.id)
    setMTipo(item.tipo||'despesa')
    setMDesc(item.descricao||'')
    setMValor(String(item.valor||''))
    setMCat(item.categoria||'')
    setMData(item.data||new Date().toISOString().slice(0,10))
    setMParcOn(false);setMParcN('')
  }

  function openFixo(){
    setModal('fixo');setFDesc('');setFValor('')
    setFTipo('despesa')
    const dc=cats.find(c=>c.tipo==='despesa')
    setFCat(dc?.nome||'')
    setFDia('1')
  }

  async function saveLancamento(){
    if(!mDesc||!mValor||Number(mValor)<=0||!mData){showToast('⚠️ Preencha todos os campos!');return}
    setSaving(true)
    if(mParcOn&&Number(mParcN)>=2){
      const total=Number(mParcN)
      const parcVal=parseFloat((Number(mValor)/total).toFixed(2))
      const parcId='parc_'+Date.now()
      const [y,m,d]=mData.split('-').map(Number)
      const rows=[]
      for(let i=0;i<total;i++){
        let pm=m-1+i,py=y
        while(pm>=12){pm-=12;py++}
        rows.push({user_id:user.id,descricao:mDesc,valor:parcVal,tipo:mTipo,categoria:mCat,data:`${py}-${String(pm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,parc_id:parcId,parc_n:i+1,parc_total:total})
      }
      await supabase.from('lancamentos').insert(rows)
      showToast(`✅ ${total} parcelas lançadas!`)
    }else{
      await supabase.from('lancamentos').insert([{user_id:user.id,descricao:mDesc,valor:Number(mValor),tipo:mTipo,categoria:mCat,data:mData}])
      showToast(`${TIPO_INFO[mTipo].icon} Salvo!`)
    }
    setModal(null);setSaving(false);load()
  }

  async function saveEdit(){
    if(!mDesc||!mValor||Number(mValor)<=0||!mData){showToast('⚠️ Preencha todos os campos!');return}
    setSaving(true)
    await supabase.from('lancamentos').update({descricao:mDesc,valor:Number(mValor),tipo:mTipo,categoria:mCat,data:mData}).eq('id',editId)
    showToast('✅ Atualizado!')
    setModal(null);setSaving(false);load()
  }

  async function saveFixo(){
    if(!fDesc||!fValor||Number(fValor)<=0){showToast('⚠️ Preencha todos os campos!');return}
    setSaving(true)
    await supabase.from('fixos').insert([{user_id:user.id,descricao:fDesc,valor:Number(fValor),tipo:fTipo,categoria:fCat,dia_vencimento:Number(fDia)}])
    setModal(null);setSaving(false);showToast('✅ Fixo adicionado!');load()
  }

  async function toggleFixo(id,ativo){await supabase.from('fixos').update({ativo:!ativo}).eq('id',id);load()}

  async function delLanc(item){
    if(item.parc_id){
      const all=lancamentos.filter(l=>l.parc_id===item.parc_id)
      if(!window.confirm(`Remover parcela?`))return
      if(window.confirm(`OK = TODAS as ${all.length} parcelas, Cancelar = só esta`)){
        await supabase.from('lancamentos').delete().eq('parc_id',item.parc_id)
        showToast('🗑️ Todas removidas.')
      }else{
        await supabase.from('lancamentos').delete().eq('id',item.id)
        showToast('🗑️ Parcela removida.')
      }
    }else{
      if(!window.confirm('Remover?'))return
      await supabase.from('lancamentos').delete().eq('id',item.id)
      showToast('🗑️ Removido.')
    }
    load()
  }

  async function delFixo(id){
    if(!window.confirm('Remover fixo?'))return
    await supabase.from('fixos').delete().eq('id',id)
    showToast('🗑️ Removido.');load()
  }

  async function addCat(){
    if(!newCatNome){showToast('⚠️ Digite o nome!');return}
    await supabase.from('categorias').insert([{user_id:user.id,nome:newCatNome,emoji:newCatEmoji,tipo:newCatTipo}])
    setNewCatNome('');showToast('✅ Categoria adicionada!');load()
  }

  async function delCat(id,nome){
    if(!window.confirm(`Remover "${nome}"?`))return
    await supabase.from('categorias').delete().eq('id',id)
    showToast('🗑️ Removida.');load()
  }

  function exportData(){
    const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),lancamentos,fixos,cats},null,2)],{type:'application/json'})
    const a=document.createElement('a')
    a.href=URL.createObjectURL(blob)
    a.download=`financas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`
    a.click();showToast('📁 Exportado!')
  }

  function Bars({items,total}){
    const cm={};items.filter(d=>d.tipo==='despesa').forEach(d=>{cm[d.categoria]=(cm[d.categoria]||0)+Number(d.valor||0)})
    const sorted=Object.entries(cm).sort((a,b)=>b[1]-a[1])
    const mx=sorted[0]?.[1]||1
    if(!sorted.length)return<div className="empty"><span className="ei">📭</span>Nenhuma despesa neste mês</div>
    return sorted.map(([cat,val])=>(
      <div className="bar-row" key={cat}>
        <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{total?` · ${Math.round(val/total*100)}%`:''}</span></div>
        <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/mx*100)}%`,background:catColor(cat)}}></div></div>
      </div>
    ))
  }

  function Row({item,showDel}){
    const ti=TIPO_INFO[item.tipo]||TIPO_INFO.despesa
    return(
      <div className="item">
        <div className={`item-ico ${ti.cls}`}>{catEmoji(item.categoria,cats)}</div>
        <div className="item-info">
          <div className="item-desc">
            {item.descricao}
            {item.parc_id&&<span className="badge badge-parc">{item.parc_n}/{item.parc_total}</span>}
            {item.isFixo&&<span className="badge badge-fixo">fixo</span>}
            {item.tipo==='investimento'&&<span className="badge badge-inv">invest.</span>}
          </div>
          <div className="item-sub">{item.categoria} · {fmtDate(item.data)}</div>
        </div>
        <div className="item-right"><div className={`item-val ${ti.cls}`}>{ti.prefix}{fmt(item.valor)}</div></div>
        {showDel&&!item.isFixo&&(
          <div style={{display:'flex',gap:2}}>
            <button className="del-btn" onClick={()=>openEdit(item)} style={{fontSize:14}}>✏️</button>
            <button className="del-btn" onClick={()=>delLanc(item)}>×</button>
          </div>
        )}
      </div>
    )
  }

  const filtered=(()=>{
    if(filter==='todos')return allMonthItems
    if(filter==='investimento')return allMonthItems.filter(d=>d.tipo==='investimento')
    if(filter==='receita')return allMonthItems.filter(d=>d.tipo==='receita')
    if(filter==='despesa')return allMonthItems.filter(d=>d.tipo==='despesa')
    if(filter==='parcelas')return monthItems.filter(d=>d.parc_id)
    if(filter==='fixos')return[...monthItems.filter(d=>d.fixo_id),...pendingFixos]
    return allMonthItems
  })()

  function trend(){
    return Array.from({length:6},(_,i)=>{
      let y=curY,m=curM-(5-i);while(m<0){m+=12;y--}
      const key=`${y}-${String(m+1).padStart(2,'0')}`
      const its=lancamentos.filter(d=>d.data?.startsWith(key))
      return{
        label:MONTHS[m].slice(0,3),
        rec:its.filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0),
        desp:its.filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0),
        inv:its.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0),
      }
    })
  }

  if(!user)return<div className="loading">Carregando...</div>
  if(loading)return<div className="loading">Carregando seus dados...</div>

  const trendData=trend()
  const maxTrend=Math.max(...trendData.map(x=>Math.max(x.rec,x.desp,x.inv)),1)
  const allDes=lancamentos.filter(d=>d.tipo==='despesa')
  const allRec=lancamentos.filter(d=>d.tipo==='receita')
  const allInv=lancamentos.filter(d=>d.tipo==='investimento')
  const totalAllDesp=allDes.reduce((s,d)=>s+Number(d.valor||0),0)
  const totalAllInv=allInv.reduce((s,d)=>s+Number(d.valor||0),0)
  const meses=new Set(lancamentos.map(d=>d.data?.slice(0,7))).size
  const catMapAll={};allDes.forEach(d=>{catMapAll[d.categoria]=(catMapAll[d.categoria]||0)+Number(d.valor||0)})
  const catsAllSorted=Object.entries(catMapAll).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const maxAllCat=catsAllSorted[0]?.[1]||1
  const invMap={};allInv.forEach(d=>{invMap[d.categoria]=(invMap[d.categoria]||0)+Number(d.valor||0)})
  const invCats=Object.entries(invMap).sort((a,b)=>b[1]-a[1])
  const maxInv=invCats[0]?.[1]||1
  const mrec=allRec.length?allRec.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allRec[0]):null
  const mdes=allDes.length?allDes.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allDes[0]):null
  const today=new Date().toISOString().slice(0,10)
  const parcIds=new Set(lancamentos.filter(d=>d.parc_id&&d.data>=today).map(d=>d.parc_id))
  const parcelasAtivas=[...parcIds].map(pid=>{
    const all=lancamentos.filter(d=>d.parc_id===pid).sort((a,b)=>a.data.localeCompare(b.data))
    const future=all.filter(d=>d.data>=today)
    return{pid,first:all[0],all,future,totalVal:all.reduce((s,d)=>s+Number(d.valor||0),0),remaining:future.reduce((s,d)=>s+Number(d.valor||0),0)}
  })

  const TipoToggle=({value,onChange})=>(
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderRadius:'var(--rads)',overflow:'hidden',border:'1px solid var(--border)',marginBottom:12}}>
      {['receita','despesa','investimento'].map(t=>(
        <button key={t} className={`tipo-btn${value===t?' on-'+t:''}`} onClick={()=>onChange(t)} type="button">
          {TIPO_INFO[t].icon} {TIPO_INFO[t].label}
        </button>
      ))}
    </div>
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
                  <div style={{fontSize:11,color:'var(--t3)'}}>Separado das despesas</div>
                </div>
              </div>
              <div className="item-val inv">{fmt(inv)}</div>
            </div>
          </div>
        )}
        {fixosAtivos.length>0&&(
          <div className="sec">
            <div className="sec-title">Fixos do mês</div>
            <div className="card">
              {fixosAtivos.map(f=>(
                <div className="item" key={f.id}>
                  <div className={`item-ico ${f.tipo==='receita'?'g':f.tipo==='investimento'?'inv':'y'}`}>{catEmoji(f.categoria,cats)}</div>
                  <div className="item-info">
                    <div className="item-desc">{f.descricao}<span className="badge badge-fixo">fixo</span></div>
                    <div className="item-sub">{f.categoria} · dia {f.dia_vencimento}</div>
                  </div>
                  <div className="item-right"><div className={`item-val ${TIPO_INFO[f.tipo]?.cls||'r'}`}>{TIPO_INFO[f.tipo]?.prefix||'-'}{fmt(f.valor)}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sec">
          <div className="sec-title">Onde está indo o dinheiro</div>
          <div className="card"><Bars items={allMonthItems} total={desp}/></div>
        </div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Últimos lançamentos</div>
          <div className="card">
            {[...monthItems].slice(0,5).map(item=><Row key={item.id} item={item}/>)}
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
          {[['todos','Todos'],['receita','Receitas'],['despesa','Despesas'],['investimento','Invest.'],['parcelas','Parcelas'],['fixos','Fixos']].map(([f,l])=>(
            <div key={f} className={`chip${filter===f?' on':''}`} onClick={()=>setFilter(f)}>{l}</div>
          ))}
        </div>
        <div className="sec" style={{marginTop:4}}>
          <div className="card">
            {filtered.length===0&&<div className="empty"><span className="ei">📭</span>Nenhum lançamento aqui</div>}
            {[...filtered].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(item=><Row key={item.id} item={item} showDel/>)}
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
            {trendData.map((x,i)=>(
              <div className="trend-row" key={i}>
                <div className="trend-month">{x.label}</div>
                <div className="trend-bars">
                  <div className="trend-bar-g" style={{width:`${Math.round(x.rec/maxTrend*100)}%`}}></div>
                  <div className="trend-bar-r" style={{width:`${Math.round(x.desp/maxTrend*100)}%`}}></div>
                  {x.inv>0&&<div style={{height:5,borderRadius:3,background:'#f59e0b',width:`${Math.round(x.inv/maxTrend*100)}%`,minWidth:2}}></div>}
                </div>
                <div className="trend-vals">
                  <span style={{color:'var(--g)'}}>{fmtShort(x.rec)}</span> / <span style={{color:'var(--r)'}}>{fmtShort(x.desp)}</span>
                  {x.inv>0&&<><br/><span style={{color:'#f59e0b',fontSize:10}}>📈 {fmtShort(x.inv)}</span></>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Top categorias despesas</div>
          <div className="card">
            {catsAllSorted.length===0&&<div className="empty">Nenhuma despesa registrada</div>}
            {catsAllSorted.map(([cat,val])=>(
              <div className="bar-row" key={cat}>
                <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totalAllDesp?` · ${Math.round(val/totalAllDesp*100)}%`:''}</span></div>
                <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/maxAllCat*100)}%`,background:catColor(cat)}}></div></div>
              </div>
            ))}
          </div>
        </div>
        {invCats.length>0&&(
          <div className="sec" style={{marginTop:16}}>
            <div className="sec-title">Investimentos por categoria</div>
            <div className="card">
              {invCats.map(([cat,val])=>(
                <div className="bar-row" key={cat}>
                  <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totalAllInv?` · ${Math.round(val/totalAllInv*100)}%`:''}</span></div>
                  <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/maxInv*100)}%`,background:catColor(cat)}}></div></div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="sec" style={{marginTop:16}}>
          <div className="sec-title">Parcelas ativas</div>
          <div className="card">
            {parcelasAtivas.length===0&&<div className="empty">Nenhuma parcela futura</div>}
            {parcelasAtivas.map(({pid,first,all,future,totalVal,remaining})=>(
              <div className="item" key={pid}>
                <div className="item-ico p">🔄</div>
                <div className="item-info">
                  <div className="item-desc">{first?.descricao}<span className="badge badge-parc">{all.length-future.length}/{all.length}</span></div>
                  <div className="item-sub">{first?.categoria} · {future.length} restante(s)</div>
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
          <button style={{padding:'9px 16px',fontSize:14,fontWeight:600,border:'none',borderRadius:'var(--rads)',background:'var(--t1)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}} onClick={openFixo}>+ Novo</button>
        </div>
        <div className="sec" style={{marginTop:12}}>
          <div className="sec-title">Total fixo mensal saídas: {fmt(fixosAtivos.filter(f=>f.tipo==='despesa').reduce((s,f)=>s+Number(f.valor||0),0))}</div>
          <div className="card">
            {fixos.length===0&&<div className="empty"><span className="ei">🔄</span>Adicione aluguel, plano de saúde, aportes fixos...</div>}
            {fixos.map(f=>(
              <div className="fixo-item" key={f.id}>
                <div className={`item-ico ${f.tipo==='receita'?'g':f.tipo==='investimento'?'inv':'y'}`}>{catEmoji(f.categoria,cats)}</div>
                <div className="item-info">
                  <div className="item-desc">{f.descricao}{f.tipo==='investimento'&&<span className="badge badge-inv">invest.</span>}</div>
                  <div className="item-sub">{f.categoria} · dia {f.dia_vencimento} · {fmt(f.valor)}</div>
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
          <button style={{padding:'8px 14px',fontSize:13,border:'1px solid var(--border)',borderRadius:'var(--rads)',background:'var(--card)',cursor:'pointer',color:'var(--t2)',fontFamily:'inherit'}} onClick={async()=>{await supabase.auth.signOut();onLogout()}}>Sair</button>
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
          <div className="bk-tip"><span>💡</span><span>Dados salvos na nuvem automaticamente. Exporte como segurança extra.</span></div>
          <div className="bk-grid">
            <button className="bk-btn pri" onClick={exportData}><span className="bi">📤</span>Exportar</button>
            <button className="bk-btn" style={{background:'var(--r)',color:'#fff',borderColor:'var(--r)'}} onClick={async()=>{if(window.confirm('Apagar TODOS os dados?')){await supabase.from('lancamentos').delete().eq('user_id',user.id);load();showToast('🗑️ Apagado.')}}}>
              <span className="bi">🗑️</span>Apagar tudo
            </button>
          </div>
        </div>
      </div>

      <button className="fab" onClick={openNew}>+</button>
      <div className={`toast${toastVisible?' show':''}`}>{toastMsg}</div>

      {/* MODAL NOVO / EDITAR */}
      {(modal==='lancamento'||modal==='editando')&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{modal==='editando'?'Editar lançamento':'Novo lançamento'}</div>
            <TipoToggle value={mTipo} onChange={changeMTipo}/>
            <div className="form-card">
              <div className="ff">
                <label htmlFor="m-desc">O quê</label>
                <input id="m-desc" placeholder="ex: biscoito, Bitcoin..." value={mDesc} onChange={e=>setMDesc(e.target.value)} autoComplete="off"/>
              </div>
              <div className="ff">
                <label htmlFor="m-valor">Valor R$</label>
                <input id="m-valor" type="number" inputMode="decimal" placeholder="0,00" value={mValor} onChange={e=>setMValor(e.target.value)}/>
              </div>
              <div className="ff">
                <label htmlFor="m-cat">Categoria</label>
                <select id="m-cat" value={mCat} onChange={e=>setMCat(e.target.value)}>
                  {cats.filter(c=>c.tipo===mTipo).map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}
                </select>
              </div>
              <div className="ff">
                <label htmlFor="m-data">Data</label>
                <input id="m-data" type="date" value={mData} onChange={e=>setMData(e.target.value)}/>
              </div>
            </div>
            {modal==='lancamento'&&(
              <div style={{background:'var(--bg)',borderRadius:'var(--rads)',border:'1px solid var(--border)',marginBottom:12,overflow:'hidden'}}>
                <div className="ff" style={{cursor:'pointer'}} onClick={()=>setMParcOn(p=>!p)}>
                  <label style={{cursor:'pointer',flex:1,color:'var(--t2)'}}>🔄 Compra parcelada?</label>
                  <span style={{fontSize:13,color:'var(--t3)'}}>{mParcOn?'Sim':'Não'}</span>
                  <span style={{color:'var(--t3)',marginLeft:6}}>›</span>
                </div>
                {mParcOn&&(
                  <div className="ff" style={{borderTop:'1px solid var(--border)'}}>
                    <label htmlFor="m-parc">Parcelas</label>
                    <input id="m-parc" type="number" inputMode="numeric" placeholder="ex: 12" min="2" max="60" value={mParcN} onChange={e=>setMParcN(e.target.value)} style={{fontFamily:'DM Mono,monospace'}}/>
                  </div>
                )}
              </div>
            )}
            <button className={`save-btn ${mTipo==='receita'?'rec':mTipo==='investimento'?'inv-btn':'des'}`} onClick={modal==='editando'?saveEdit:saveLancamento} disabled={saving}>
              {saving?'Salvando...':modal==='editando'?'✅ Salvar alterações':`${TIPO_INFO[mTipo].icon} Salvar ${TIPO_INFO[mTipo].label.toLowerCase()}`}
            </button>
          </div>
        </div>
      )}

      {/* MODAL FIXO */}
      {modal==='fixo'&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">Novo custo fixo</div>
            <div style={{fontSize:13,color:'var(--t2)',marginBottom:12,lineHeight:1.5}}>Aparece automaticamente todo mês.</div>
            <TipoToggle value={fTipo} onChange={t=>{setFTipo(t);setFCat(cats.find(c=>c.tipo===t)?.nome||'')}}/>
            <div className="form-card">
              <div className="ff"><label htmlFor="f-desc">Nome</label><input id="f-desc" placeholder="ex: Plano de saúde" value={fDesc} onChange={e=>setFDesc(e.target.value)}/></div>
              <div className="ff"><label htmlFor="f-valor">Valor R$</label><input id="f-valor" type="number" inputMode="decimal" placeholder="0,00" value={fValor} onChange={e=>setFValor(e.target.value)}/></div>
              <div className="ff"><label htmlFor="f-cat">Categoria</label>
                <select id="f-cat" value={fCat} onChange={e=>setFCat(e.target.value)}>
                  {cats.filter(c=>c.tipo===fTipo).map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}
                </select>
              </div>
              <div className="ff"><label htmlFor="f-dia">Dia do mês</label>
                <select id="f-dia" value={fDia} onChange={e=>setFDia(e.target.value)}>
                  {Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}
                </select>
              </div>
            </div>
            <button className={`save-btn ${fTipo==='receita'?'rec':fTipo==='investimento'?'inv-btn':'des'}`} onClick={saveFixo} disabled={saving}>
              {saving?'Salvando...':'✅ Salvar fixo'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
