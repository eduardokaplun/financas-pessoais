'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '../../lib/supabase'

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const EMOJIS = ['🍽️','🏠','🚗','💊','📚','🎮','👕','📱','🐾','🎁','✈️','💪','🎵','🍺','💅','🛒','⚡','💧','🏥','🎓','💼','💻','📈','🏦','⭐','➕','₿','📊','🪙','💎','🏗️','🌾']
const BANDEIRAS = ['Visa','Mastercard','Elo','Amex','Hipercard','Outro']
const CORES_CARTAO = ['#2f6fed','#1a1917','#e03e3e','#16a06a','#7c3aed','#f59e0b','#db2777','#0891b2']
const DEFAULT_CATS = [
  {nome:'Salário',emoji:'💼',tipo:'receita'},{nome:'Freelance',emoji:'💻',tipo:'receita'},
  {nome:'Rendimentos',emoji:'📈',tipo:'receita'},{nome:'Outros (entrada)',emoji:'➕',tipo:'receita'},
  {nome:'Alimentação',emoji:'🍽️',tipo:'despesa'},{nome:'Moradia',emoji:'🏠',tipo:'despesa'},
  {nome:'Transporte',emoji:'🚗',tipo:'despesa'},{nome:'Saúde',emoji:'💊',tipo:'despesa'},
  {nome:'Educação',emoji:'📚',tipo:'despesa'},{nome:'Lazer',emoji:'🎮',tipo:'despesa'},
  {nome:'Vestuário',emoji:'👕',tipo:'despesa'},{nome:'Serviços',emoji:'📱',tipo:'despesa'},
  {nome:'Pets',emoji:'🐾',tipo:'despesa'},{nome:'Presentes',emoji:'🎁',tipo:'despesa'},
  {nome:'Outros',emoji:'⭐',tipo:'despesa'},
  {nome:'Bitcoin (BTC)',emoji:'₿',tipo:'investimento'},{nome:'Criptomoedas',emoji:'🪙',tipo:'investimento'},
  {nome:'Ações',emoji:'📊',tipo:'investimento'},{nome:'Fundos',emoji:'🏦',tipo:'investimento'},
  {nome:'Tesouro Direto',emoji:'💎',tipo:'investimento'},{nome:'Renda Fixa',emoji:'🏗️',tipo:'investimento'},
  {nome:'Poupança',emoji:'💰',tipo:'investimento'},{nome:'Outros (invest.)',emoji:'📈',tipo:'investimento'},
]
const CAT_COLORS = {
  'Alimentação':'#16a06a','Moradia':'#2f6fed','Transporte':'#d97706','Saúde':'#e03e3e',
  'Educação':'#7c3aed','Lazer':'#db2777','Vestuário':'#ea580c','Serviços':'#059669',
  'Pets':'#0891b2','Presentes':'#be185d','Outros':'#6b7280',
  'Salário':'#16a06a','Freelance':'#2f6fed','Rendimentos':'#7c3aed','Outros (entrada)':'#6b7280',
  'Bitcoin (BTC)':'#f59e0b','Criptomoedas':'#f97316','Ações':'#10b981',
  'Fundos':'#6366f1','Tesouro Direto':'#8b5cf6','Renda Fixa':'#06b6d4',
  'Poupança':'#14b8a6','Outros (invest.)':'#64748b',
}
const TIPO_INFO = {
  receita:{cls:'g',prefix:'+',label:'Receita',icon:'💰',btnCls:'rec'},
  despesa:{cls:'r',prefix:'-',label:'Despesa',icon:'💸',btnCls:'des'},
  investimento:{cls:'inv',prefix:'→',label:'Investimento',icon:'📈',btnCls:'inv-btn'},
}
function fmt(v){return 'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})}
function fmtS(v){if(v>=1000)return 'R$'+(v/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k';return fmt(v)}
function fmtDate(s){if(!s)return '';const[,m,d]=s.split('-');return `${d}/${m}`}
function catColor(n){return CAT_COLORS[n]||(()=>{const c=['#16a06a','#2f6fed','#d97706','#7c3aed','#db2777','#0891b2','#be185d','#059669','#e03e3e'];let h=0;for(let i=0;i<n.length;i++)h=(h*31+n.charCodeAt(i))%c.length;return c[Math.abs(h)]})()}
function catEmoji(n,cats){return (cats||[]).find(c=>c.nome===n)?.emoji||'📌'}
function mLabel(k){if(!k)return '';const[y,m]=k.split('-');return `${MONTHS[parseInt(m)-1]} ${y}`}

export default function Dashboard({user,onLogout}){
  const sb = createClient()
  const [tab,setTab]=useState('inicio')
  const [lancs,setLancs]=useState([])
  const [cats,setCats]=useState([])
  const [fixos,setFixos]=useState([])
  const [cartoes,setCartoes]=useState([])
  const [faturas,setFaturas]=useState([])
  const [loading,setLoading]=useState(true)
  const now=new Date()
  const [curY,setCurY]=useState(now.getFullYear())
  const [curM,setCurM]=useState(now.getMonth())
  const [filter,setFilter]=useState('todos')
  const [toast,setToast]=useState('')
  const [toastV,setToastV]=useState(false)
  const [modal,setModal]=useState(null)
  const [editId,setEditId]=useState(null)
  const [mTipo,setMTipo]=useState('despesa')
  const [mDesc,setMDesc]=useState('')
  const [mValor,setMValor]=useState('')
  const [mCat,setMCat]=useState('')
  const [mData,setMData]=useState(new Date().toISOString().slice(0,10))
  const [mCartao,setMCartao]=useState('')
  const [mParcOn,setMParcOn]=useState(false)
  const [mParcN,setMParcN]=useState('')
  const [saving,setSaving]=useState(false)
  const [fDesc,setFDesc]=useState('')
  const [fValor,setFValor]=useState('')
  const [fCat,setFCat]=useState('')
  const [fTipo,setFTipo]=useState('despesa')
  const [fDia,setFDia]=useState('1')
  const [cNome,setCNome]=useState('')
  const [cBand,setCBand]=useState('Visa')
  const [cLim,setCLim]=useState('')
  const [cFech,setCFech]=useState('1')
  const [cVenc,setCVenc]=useState('10')
  const [cCor,setCCor]=useState('#2f6fed')
  const [pfCartao,setPfCartao]=useState(null)
  const [pfMes,setPfMes]=useState('')
  const [pfData,setPfData]=useState(new Date().toISOString().slice(0,10))
  const [ncNome,setNcNome]=useState('')
  const [ncEmoji,setNcEmoji]=useState('⭐')
  const [ncTipo,setNcTipo]=useState('despesa')

  function showT(msg){setToast(msg);setToastV(true);setTimeout(()=>setToastV(false),2500)}

  const load=useCallback(async()=>{
    if(!user?.id)return
    setLoading(true)
    const [l,c,f,cr,fat]=await Promise.all([
      sb.from('lancamentos').select('*').eq('user_id',user.id).order('data',{ascending:false}),
      sb.from('categorias').select('*').eq('user_id',user.id).order('criado_em'),
      sb.from('fixos').select('*').eq('user_id',user.id).order('criado_em'),
      sb.from('cartoes').select('*').eq('user_id',user.id).order('criado_em'),
      sb.from('faturas').select('*').eq('user_id',user.id).order('criado_em',{ascending:false}),
    ])
    setLancs(l.data||[])
    setCartoes(cr.data||[])
    setFaturas(fat.data||[])
    let cd=c.data||[]
    if(cd.length===0){
      const{data:ins}=await sb.from('categorias').insert(DEFAULT_CATS.map(d=>({...d,user_id:user.id}))).select()
      cd=ins||DEFAULT_CATS
    }else{
      const ex=new Set(cd.map(c=>c.nome))
      const miss=DEFAULT_CATS.filter(d=>d.tipo==='investimento'&&!ex.has(d.nome))
      if(miss.length){const{data:ins2}=await sb.from('categorias').insert(miss.map(d=>({...d,user_id:user.id}))).select();cd=[...cd,...(ins2||[])]}
    }
    setCats(cd);setFixos(f.data||[]);setLoading(false)
  },[user])

  useEffect(()=>{if(user?.id)load()},[load,user])

  const mk=`${curY}-${String(curM+1).padStart(2,'0')}`
  const mItems=lancs.filter(d=>d.data?.startsWith(mk))
  const fatsPagas=faturas.filter(f=>f.data_pagamento?.startsWith(mk))
  const fixosA=fixos.filter(f=>f.ativo)
  const pendF=fixosA.filter(f=>!mItems.find(l=>l.fixo_id===f.id)).map(f=>({id:'fixo_'+f.id,descricao:f.descricao,valor:f.valor,tipo:f.tipo,categoria:f.categoria,data:`${mk}-${String(f.dia_vencimento).padStart(2,'0')}`,isFixo:true,fixoId:f.id}))
  const allM=[...mItems,...pendF]
  const noCard=mItems.filter(d=>!d.cartao_id)
  const rec=[...noCard,...pendF.filter(f=>f.tipo==='receita')].filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0)
  const desp=[...noCard,...pendF.filter(f=>f.tipo==='despesa')].filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0)
  const inv=noCard.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0)
  const totalFP=fatsPagas.reduce((s,f)=>s+Number(f.valor_total||0),0)
  const saldo=rec-desp-inv-totalFP

  function gcMes(cid,key){return lancs.filter(d=>d.cartao_id===cid&&d.data?.startsWith(key))}
  function tcMes(cid,key){return gcMes(cid,key).reduce((s,d)=>s+Number(d.valor||0),0)}
  function fpaga(cid,key){return faturas.find(f=>f.cartao_id===cid&&f.mes_ref===key)}

  function pm(){if(curM===0){setCurM(11);setCurY(y=>y-1)}else setCurM(m=>m-1)}
  function nm(){if(curM===11){setCurM(0);setCurY(y=>y+1)}else setCurM(m=>m+1)}

  function cmt(t){setMTipo(t);setMCat(cats.find(c=>c.tipo===t)?.nome||'')}

  function openNew(){
    setModal('lanc');setEditId(null);setMTipo('despesa');setMDesc('');setMValor('')
    setMCat(cats.find(c=>c.tipo==='despesa')?.nome||'')
    setMData(new Date().toISOString().slice(0,10));setMCartao('');setMParcOn(false);setMParcN('')
  }
  function openEdit(item){
    setModal('edit');setEditId(item.id);setMTipo(item.tipo||'despesa')
    setMDesc(item.descricao||'');setMValor(String(item.valor||''))
    setMCat(item.categoria||'');setMData(item.data||new Date().toISOString().slice(0,10))
    setMCartao(item.cartao_id||'');setMParcOn(false);setMParcN('')
  }
  function openCartao(){setModal('cartao');setCNome('');setCBand('Visa');setCLim('');setCFech('1');setCVenc('10');setCCor('#2f6fed')}
  function openPF(c){setPfCartao(c);setPfMes(mk);setPfData(new Date().toISOString().slice(0,10));setModal('pf')}
  function openFixo(){
    setModal('fixo');setFDesc('');setFValor('')
    setFTipo('despesa');setFCat(cats.find(c=>c.tipo==='despesa')?.nome||'');setFDia('1')
  }

  async function saveLanc(){
    if(!mDesc||!mValor||Number(mValor)<=0||!mData){showT('⚠️ Preencha todos os campos!');return}
    setSaving(true)
    if(mParcOn&&Number(mParcN)>=2){
      const tot=Number(mParcN),pv=parseFloat((Number(mValor)/tot).toFixed(2)),pid='parc_'+Date.now()
      const[y,m,d]=mData.split('-').map(Number),rows=[]
      for(let i=0;i<tot;i++){let pm=m-1+i,py=y;while(pm>=12){pm-=12;py++};rows.push({user_id:user.id,descricao:mDesc,valor:pv,tipo:mTipo,categoria:mCat,data:`${py}-${String(pm+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,parc_id:pid,parc_n:i+1,parc_total:tot,cartao_id:mCartao||null})}
      await sb.from('lancamentos').insert(rows);showT(`✅ ${tot} parcelas!`)
    }else{
      await sb.from('lancamentos').insert([{user_id:user.id,descricao:mDesc,valor:Number(mValor),tipo:mTipo,categoria:mCat,data:mData,cartao_id:mCartao||null}])
      showT(`${TIPO_INFO[mTipo].icon} Salvo!`)
    }
    setModal(null);setSaving(false);load()
  }
  async function saveEdit(){
    if(!mDesc||!mValor||Number(mValor)<=0||!mData){showT('⚠️ Preencha todos!');return}
    setSaving(true)
    await sb.from('lancamentos').update({descricao:mDesc,valor:Number(mValor),tipo:mTipo,categoria:mCat,data:mData,cartao_id:mCartao||null}).eq('id',editId)
    showT('✅ Atualizado!');setModal(null);setSaving(false);load()
  }
  async function saveFixo(){
    if(!fDesc||!fValor||Number(fValor)<=0){showT('⚠️ Preencha todos!');return}
    setSaving(true)
    await sb.from('fixos').insert([{user_id:user.id,descricao:fDesc,valor:Number(fValor),tipo:fTipo,categoria:fCat,dia_vencimento:Number(fDia)}])
    setModal(null);setSaving(false);showT('✅ Fixo adicionado!');load()
  }
  async function saveCartao(){
    if(!cNome){showT('⚠️ Digite o nome!');return}
    setSaving(true)
    await sb.from('cartoes').insert([{user_id:user.id,nome:cNome,bandeira:cBand,limite:cLim?Number(cLim):null,dia_fechamento:Number(cFech),dia_vencimento:Number(cVenc),cor:cCor}])
    setModal(null);setSaving(false);showT('💳 Cartão adicionado!');load()
  }
  async function pagarFatura(){
    if(!pfCartao||!pfMes||!pfData){showT('⚠️ Preencha todos!');return}
    const tot=tcMes(pfCartao.id,pfMes)
    if(tot===0){showT('⚠️ Nenhum gasto neste mês.');return}
    setSaving(true)
    await sb.from('faturas').insert([{user_id:user.id,cartao_id:pfCartao.id,mes_ref:pfMes,valor_total:tot,data_pagamento:pfData}])
    setModal(null);setSaving(false);showT(`✅ Fatura ${fmt(tot)} paga!`);load()
  }
  async function delCartao(id){
    if(!window.confirm('Remover cartão?'))return
    await sb.from('cartoes').delete().eq('id',id);showT('🗑️ Removido.');load()
  }
  async function toggleFixo(id,a){await sb.from('fixos').update({ativo:!a}).eq('id',id);load()}
  async function delLanc(item){
    if(item.parc_id){
      const all=lancs.filter(l=>l.parc_id===item.parc_id)
      if(!window.confirm('Remover?'))return
      if(window.confirm(`OK=TODAS(${all.length}), Cancelar=só esta`)){await sb.from('lancamentos').delete().eq('parc_id',item.parc_id);showT('🗑️ Todas.')}
      else{await sb.from('lancamentos').delete().eq('id',item.id);showT('🗑️ Parcela.')}
    }else{
      if(!window.confirm('Remover?'))return
      await sb.from('lancamentos').delete().eq('id',item.id);showT('🗑️ Removido.')
    }
    load()
  }
  async function delFixo(id){if(!window.confirm('Remover?'))return;await sb.from('fixos').delete().eq('id',id);showT('🗑️ Removido.');load()}
  async function addCat(){if(!ncNome){showT('⚠️ Digite o nome!');return};await sb.from('categorias').insert([{user_id:user.id,nome:ncNome,emoji:ncEmoji,tipo:ncTipo}]);setNcNome('');showT('✅ Categoria!');load()}
  async function delCat(id,n){if(!window.confirm(`Remover "${n}"?`))return;await sb.from('categorias').delete().eq('id',id);showT('🗑️ Removida.');load()}
  function exportData(){
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify({exportedAt:new Date().toISOString(),lancs,fixos,cats,cartoes,faturas},null,2)],{type:'application/json'}))
    a.download=`financas_${new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')}.json`;a.click();showT('📁 Exportado!')
  }

  function Bars({items,total}){
    const cm={};items.filter(d=>d.tipo==='despesa').forEach(d=>{cm[d.categoria]=(cm[d.categoria]||0)+Number(d.valor||0)})
    const s=Object.entries(cm).sort((a,b)=>b[1]-a[1]),mx=s[0]?.[1]||1
    if(!s.length)return<div className="empty"><span className="ei">📭</span>Nenhuma despesa neste mês</div>
    return s.map(([cat,val])=>(
      <div className="bar-row" key={cat}>
        <div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{total?` · ${Math.round(val/total*100)}%`:''}</span></div>
        <div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/mx*100)}%`,background:catColor(cat)}}></div></div>
      </div>
    ))
  }

  function Row({item,showDel}){
    const ti=TIPO_INFO[item.tipo]||TIPO_INFO.despesa
    const cn=item.cartao_id?cartoes.find(c=>c.id===item.cartao_id)?.nome:null
    return(
      <div className="item">
        <div className={`item-ico ${ti.cls}`}>{catEmoji(item.categoria,cats)}</div>
        <div className="item-info">
          <div className="item-desc">
            {item.descricao}
            {item.parc_id&&<span className="badge badge-parc">{item.parc_n}/{item.parc_total}</span>}
            {item.isFixo&&<span className="badge badge-fixo">fixo</span>}
            {item.tipo==='investimento'&&<span className="badge badge-inv">invest.</span>}
            {cn&&<span className="badge badge-cartao">💳 {cn}</span>}
          </div>
          <div className="item-sub">{item.categoria} · {fmtDate(item.data)}</div>
        </div>
        <div className="item-right"><div className={`item-val ${ti.cls}`}>{ti.prefix}{fmt(item.valor)}</div></div>
        {showDel&&!item.isFixo&&<div style={{display:'flex',gap:2}}><button className="del-btn" onClick={()=>openEdit(item)} style={{fontSize:14}}>✏️</button><button className="del-btn" onClick={()=>delLanc(item)}>×</button></div>}
      </div>
    )
  }

  const filt=(()=>{
    if(filter==='todos')return allM
    if(filter==='receita')return allM.filter(d=>d.tipo==='receita')
    if(filter==='despesa')return allM.filter(d=>d.tipo==='despesa')
    if(filter==='cartao')return mItems.filter(d=>d.cartao_id)
    if(filter==='investimento')return allM.filter(d=>d.tipo==='investimento')
    if(filter==='parcelas')return mItems.filter(d=>d.parc_id)
    return allM
  })()

  function trendD(){
    return Array.from({length:6},(_,i)=>{
      let y=curY,m=curM-(5-i);while(m<0){m+=12;y--}
      const key=`${y}-${String(m+1).padStart(2,'0')}`
      const its=lancs.filter(d=>d.data?.startsWith(key)&&!d.cartao_id)
      const fts=faturas.filter(f=>f.data_pagamento?.startsWith(key))
      return{label:MONTHS[m].slice(0,3),rec:its.filter(d=>d.tipo==='receita').reduce((s,d)=>s+Number(d.valor||0),0),desp:its.filter(d=>d.tipo==='despesa').reduce((s,d)=>s+Number(d.valor||0),0)+fts.reduce((s,f)=>s+Number(f.valor_total||0),0),inv:its.filter(d=>d.tipo==='investimento').reduce((s,d)=>s+Number(d.valor||0),0)}
    })
  }

  const TT=({value,onChange})=>(
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderRadius:'var(--rads)',overflow:'hidden',border:'1px solid var(--border)',marginBottom:12}}>
      {['receita','despesa','investimento'].map(t=>(
        <button key={t} className={`tipo-btn${value===t?' on-'+t:''}`} onClick={()=>onChange(t)} type="button">{TIPO_INFO[t].icon} {TIPO_INFO[t].label}</button>
      ))}
    </div>
  )

  if(!user)return<div className="loading">Carregando...</div>
  if(loading)return<div className="loading">Carregando seus dados...</div>

  const td=trendD(),maxT=Math.max(...td.map(x=>Math.max(x.rec,x.desp,x.inv)),1)
  const allD=lancs.filter(d=>d.tipo==='despesa'),allR=lancs.filter(d=>d.tipo==='receita'),allI=lancs.filter(d=>d.tipo==='investimento')
  const totD=allD.reduce((s,d)=>s+Number(d.valor||0),0),totI=allI.reduce((s,d)=>s+Number(d.valor||0),0)
  const meses=new Set(lancs.map(d=>d.data?.slice(0,7))).size
  const cm2={};allD.forEach(d=>{cm2[d.categoria]=(cm2[d.categoria]||0)+Number(d.valor||0)})
  const cs=Object.entries(cm2).sort((a,b)=>b[1]-a[1]).slice(0,8),mxc=cs[0]?.[1]||1
  const im={};allI.forEach(d=>{im[d.categoria]=(im[d.categoria]||0)+Number(d.valor||0)})
  const ic=Object.entries(im).sort((a,b)=>b[1]-a[1]),mxi=ic[0]?.[1]||1
  const mrec=allR.length?allR.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allR[0]):null
  const mdes=allD.length?allD.reduce((mx,d)=>Number(d.valor||0)>Number(mx.valor||0)?d:mx,allD[0]):null
  const tod=new Date().toISOString().slice(0,10)
  const pids=new Set(lancs.filter(d=>d.parc_id&&d.data>=tod).map(d=>d.parc_id))
  const paAtivas=[...pids].map(pid=>{
    const a=lancs.filter(d=>d.parc_id===pid).sort((a,b)=>a.data.localeCompare(b.data)),fu=a.filter(d=>d.data>=tod)
    return{pid,first:a[0],all:a,future:fu,tv:a.reduce((s,d)=>s+Number(d.valor||0),0),rem:fu.reduce((s,d)=>s+Number(d.valor||0),0)}
  })
  const mF=Array.from({length:6},(_,i)=>{let y=curY,m=curM-i;while(m<0){m+=12;y--};return `${y}-${String(m+1).padStart(2,'0')}`})

  return(
    <>
      <div className="tabs">
        <div className="tab-nav">
          {[['inicio','🏠','Início'],['lancamentos','📋','Lançamentos'],['cartoes','💳','Cartões'],['relatorio','📊','Relatório'],['config','⚙️','Config']].map(([id,icon,label])=>(
            <button key={id} className={`tab-btn${tab===id?' on':''}`} onClick={()=>setTab(id)}><span className="ticon">{icon}</span>{label}</button>
          ))}
        </div>
      </div>

      {/* INÍCIO */}
      <div className={`page${tab==='inicio'?' on':''}`}>
        <div className="month-nav">
          <button className="mnav-btn" onClick={pm}>‹</button>
          <div className="mnav-label">{MONTHS[curM]} {curY}</div>
          <button className="mnav-btn" onClick={nm}>›</button>
        </div>
        <div className="hero">
          <div className="hero-label">Saldo do mês</div>
          <div className={`hero-val${saldo>0?' pos':saldo<0?' neg':' zero'}`}>{fmt(saldo)}</div>
        </div>
        <div className="metrics">
          <div className="metric"><div className="metric-label">Receitas</div><div className="metric-val g">{fmt(rec)}</div></div>
          <div className="metric"><div className="metric-label">Despesas</div><div className="metric-val r">{fmt(desp+totalFP)}</div></div>
        </div>
        {inv>0&&<div style={{margin:'0 20px 12px'}}><div className="card" style={{padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{display:'flex',alignItems:'center',gap:10}}><div className="item-ico inv" style={{width:32,height:32,fontSize:15}}>📈</div><div><div style={{fontSize:13,fontWeight:500}}>Investimentos do mês</div><div style={{fontSize:11,color:'var(--t3)'}}>Separado das despesas</div></div></div><div className="item-val inv">{fmt(inv)}</div></div></div>}
        {cartoes.length>0&&(
          <div className="sec">
            <div className="sec-title">Faturas abertas</div>
            <div className="card">
              {cartoes.map(c=>{
                const tot=tcMes(c.id,mk),pg=fpaga(c.id,mk)
                return(
                  <div className="item" key={c.id}>
                    <div style={{width:36,height:36,borderRadius:11,background:c.cor+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:17,flexShrink:0}}>💳</div>
                    <div className="item-info"><div className="item-desc">{c.nome} <span style={{fontSize:11,color:'var(--t3)',fontWeight:400}}>{c.bandeira}</span></div><div className="item-sub">{pg?'✅ Paga':'Vence dia '+c.dia_vencimento}</div></div>
                    <div className="item-right"><div className="item-val r" style={{color:c.cor}}>{fmt(tot)}</div>{!pg&&tot>0&&<button onClick={()=>openPF(c)} style={{fontSize:11,padding:'3px 8px',background:c.cor,color:'#fff',border:'none',borderRadius:6,cursor:'pointer',marginTop:4,display:'block',fontFamily:'inherit'}}>Pagar</button>}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {fixosA.length>0&&<div className="sec"><div className="sec-title">Fixos do mês</div><div className="card">{fixosA.map(f=><div className="item" key={f.id}><div className={`item-ico ${f.tipo==='receita'?'g':f.tipo==='investimento'?'inv':'y'}`}>{catEmoji(f.categoria,cats)}</div><div className="item-info"><div className="item-desc">{f.descricao}<span className="badge badge-fixo">fixo</span></div><div className="item-sub">{f.categoria} · dia {f.dia_vencimento}</div></div><div className="item-right"><div className={`item-val ${TIPO_INFO[f.tipo]?.cls||'r'}`}>{TIPO_INFO[f.tipo]?.prefix||'-'}{fmt(f.valor)}</div></div></div>)}</div></div>}
        <div className="sec"><div className="sec-title">Onde está indo o dinheiro</div><div className="card"><Bars items={allM} total={desp}/></div></div>
        <div className="sec" style={{marginTop:16}}><div className="sec-title">Últimos lançamentos</div><div className="card">{[...mItems].slice(0,5).map(item=><Row key={item.id} item={item}/>)}{mItems.length===0&&<div className="empty"><span className="ei">📭</span>Toque em + para adicionar</div>}</div></div>
      </div>

      {/* LANÇAMENTOS */}
      <div className={`page${tab==='lancamentos'?' on':''}`}>
        <div className="month-nav"><button className="mnav-btn" onClick={pm}>‹</button><div className="mnav-label">{MONTHS[curM]} {curY}</div><button className="mnav-btn" onClick={nm}>›</button></div>
        <div className="filters">{[['todos','Todos'],['receita','Receitas'],['despesa','Despesas'],['cartao','💳 Cartão'],['investimento','Invest.'],['parcelas','Parcelas']].map(([f,l])=><div key={f} className={`chip${filter===f?' on':''}`} onClick={()=>setFilter(f)}>{l}</div>)}</div>
        <div className="sec" style={{marginTop:4}}><div className="card">{filt.length===0&&<div className="empty"><span className="ei">📭</span>Nenhum lançamento aqui</div>}{[...filt].sort((a,b)=>(b.data||'').localeCompare(a.data||'')).map(item=><Row key={item.id} item={item} showDel/>)}</div></div>
      </div>

      {/* CARTÕES */}
      <div className={`page${tab==='cartoes'?' on':''}`}>
        <div style={{padding:'16px 20px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div><div style={{fontSize:18,fontWeight:600}}>Cartões de crédito</div><div style={{fontSize:13,color:'var(--t3)',marginTop:2}}>Gerencie faturas e gastos</div></div>
          <button style={{padding:'9px 16px',fontSize:14,fontWeight:600,border:'none',borderRadius:'var(--rads)',background:'var(--t1)',color:'#fff',cursor:'pointer',fontFamily:'inherit'}} onClick={openCartao}>+ Novo</button>
        </div>
        {cartoes.length===0&&<div className="sec" style={{marginTop:12}}><div className="card"><div className="empty"><span className="ei">💳</span>Nenhum cartão cadastrado.</div></div></div>}
        {cartoes.map(c=>{
          const tot=tcMes(c.id,mk),pg=fpaga(c.id,mk)
          const ult=Array.from({length:3},(_,i)=>{let y=curY,m=curM-i;while(m<0){m+=12;y--};const k=`${y}-${String(m+1).padStart(2,'0')}`;return{k,label:MONTHS[m].slice(0,3),tot:tcMes(c.id,k),pg:!!fpaga(c.id,k)}})
          return(
            <div key={c.id} className="sec" style={{marginTop:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8}}><div style={{width:12,height:12,borderRadius:'50%',background:c.cor}}></div><span style={{fontSize:14,fontWeight:600}}>{c.nome}</span><span style={{fontSize:12,color:'var(--t3)'}}>{c.bandeira}</span></div>
                <button className="del-btn" onClick={()=>delCartao(c.id)}>×</button>
              </div>
              <div className="card">
                <div style={{padding:'14px 16px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div><div style={{fontSize:12,color:'var(--t3)',marginBottom:2}}>Fatura {mLabel(mk)}</div><div style={{fontSize:22,fontWeight:600,fontFamily:'DM Mono,monospace',color:pg?'var(--g)':'var(--r)'}}>{fmt(tot)}</div><div style={{fontSize:12,color:'var(--t3)',marginTop:2}}>Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}</div></div>
                    <div style={{textAlign:'right'}}>{pg?<span style={{fontSize:13,color:'var(--g)',fontWeight:500}}>✅ Paga</span>:tot>0?<button onClick={()=>openPF(c)} style={{padding:'10px 16px',background:c.cor,color:'#fff',border:'none',borderRadius:'var(--rads)',cursor:'pointer',fontWeight:600,fontSize:14,fontFamily:'inherit'}}>Pagar fatura</button>:<span style={{fontSize:13,color:'var(--t3)'}}>Sem gastos</span>}</div>
                  </div>
                </div>
                <div style={{padding:'10px 16px',borderBottom:'1px solid var(--border)'}}>
                  <div style={{fontSize:11,color:'var(--t3)',marginBottom:8,textTransform:'uppercase',letterSpacing:.5}}>Histórico</div>
                  <div style={{display:'flex',gap:12}}>{ult.map(({k,label,tot,pg})=><div key={k} style={{flex:1,textAlign:'center'}}><div style={{fontSize:12,color:'var(--t2)',marginBottom:4}}>{label}</div><div style={{fontSize:14,fontWeight:600,fontFamily:'DM Mono,monospace',color:pg?'var(--g)':tot>0?'var(--r)':'var(--t3)'}}>{tot>0?fmtS(tot):'—'}</div>{pg&&<div style={{fontSize:10,color:'var(--g)'}}>✅</div>}</div>)}</div>
                </div>
                <div>{lancs.filter(d=>d.cartao_id===c.id&&d.data?.startsWith(mk)).slice(0,5).map(item=><Row key={item.id} item={item} showDel/>)}{lancs.filter(d=>d.cartao_id===c.id&&d.data?.startsWith(mk)).length===0&&<div className="empty" style={{padding:'1rem'}}>Nenhum gasto neste mês</div>}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* RELATÓRIO */}
      <div className={`page${tab==='relatorio'?' on':''}`}>
        <div style={{padding:'16px 20px 4px'}}><div style={{fontSize:18,fontWeight:600}}>Relatório geral</div></div>
        <div className="rel-grid">
          <div className="rel-card"><div className="rel-label">Total registros</div><div className="rel-val">{lancs.length}</div></div>
          <div className="rel-card"><div className="rel-label">Meses ativos</div><div className="rel-val">{meses}</div></div>
          <div className="rel-card"><div className="rel-label">Maior receita</div><div className="rel-val g">{mrec?fmt(mrec.valor):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Maior despesa</div><div className="rel-val r">{mdes?fmt(mdes.valor):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Média rec./mês</div><div className="rel-val g">{meses?fmt(allR.reduce((s,d)=>s+Number(d.valor||0),0)/meses):'—'}</div></div>
          <div className="rel-card"><div className="rel-label">Total investido</div><div className="rel-val inv">{fmt(totI)}</div></div>
        </div>
        <div className="sec" style={{marginTop:16}}><div className="sec-title">Evolução (últimos 6 meses)</div><div className="card">{td.map((x,i)=><div className="trend-row" key={i}><div className="trend-month">{x.label}</div><div className="trend-bars"><div className="trend-bar-g" style={{width:`${Math.round(x.rec/maxT*100)}%`}}></div><div className="trend-bar-r" style={{width:`${Math.round(x.desp/maxT*100)}%`}}></div>{x.inv>0&&<div style={{height:5,borderRadius:3,background:'#f59e0b',width:`${Math.round(x.inv/maxT*100)}%`,minWidth:2}}></div>}</div><div className="trend-vals"><span style={{color:'var(--g)'}}>{fmtS(x.rec)}</span> / <span style={{color:'var(--r)'}}>{fmtS(x.desp)}</span>{x.inv>0&&<><br/><span style={{color:'#f59e0b',fontSize:10}}>📈 {fmtS(x.inv)}</span></>}</div></div>)}</div></div>
        <div className="sec" style={{marginTop:16}}><div className="sec-title">Top categorias despesas</div><div className="card">{cs.length===0&&<div className="empty">Nenhuma despesa</div>}{cs.map(([cat,val])=><div className="bar-row" key={cat}><div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totD?` · ${Math.round(val/totD*100)}%`:''}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/mxc*100)}%`,background:catColor(cat)}}></div></div></div>)}</div></div>
        {ic.length>0&&<div className="sec" style={{marginTop:16}}><div className="sec-title">Investimentos por categoria</div><div className="card">{ic.map(([cat,val])=><div className="bar-row" key={cat}><div className="bar-top"><span className="bar-name">{catEmoji(cat,cats)} {cat}</span><span className="bar-pct">{fmt(val)}{totI?` · ${Math.round(val/totI*100)}%`:''}</span></div><div className="bar-track"><div className="bar-fill" style={{width:`${Math.round(val/mxi*100)}%`,background:catColor(cat)}}></div></div></div>)}</div></div>}
        <div className="sec" style={{marginTop:16}}><div className="sec-title">Parcelas ativas</div><div className="card">{paAtivas.length===0&&<div className="empty">Nenhuma parcela futura</div>}{paAtivas.map(({pid,first,all,future,tv,rem})=><div className="item" key={pid}><div className="item-ico p">🔄</div><div className="item-info"><div className="item-desc">{first?.descricao}<span className="badge badge-parc">{all.length-future.length}/{all.length}</span></div><div className="item-sub">{first?.categoria} · {future.length} restante(s)</div></div><div className="item-right"><div className="item-val p">-{fmt(rem)}</div><div className="item-sub2">total -{fmt(tv)}</div></div></div>)}</div></div>
      </div>

      {/* CONFIG */}
      <div className={`page${tab==='config'?' on':''}`}>
        <div style={{padding:'16px 20px 4px',display:'flex',alignItems:'center',justifyContent:'space-between'}}><div style={{fontSize:18,fontWeight:600}}>Configurações</div><button style={{padding:'8px 14px',fontSize:13,border:'1px solid var(--border)',borderRadius:'var(--rads)',background:'var(--card)',cursor:'pointer',color:'var(--t2)',fontFamily:'inherit'}} onClick={async()=>{await sb.auth.signOut();onLogout()}}>Sair</button></div>
        <div style={{padding:'4px 20px 0',fontSize:13,color:'var(--t3)'}}>{user?.email}</div>
        <div className="sec" style={{marginTop:16}}><div className="sec-title">Minhas categorias</div>
          <div className="cat-form"><input placeholder="Nome da categoria" value={ncNome} onChange={e=>setNcNome(e.target.value)} maxLength={30}/><select value={ncEmoji} onChange={e=>setNcEmoji(e.target.value)}>{EMOJIS.map(e=><option key={e} value={e}>{e}</option>)}</select><select value={ncTipo} onChange={e=>setNcTipo(e.target.value)}><option value="despesa">Saída</option><option value="receita">Entrada</option><option value="investimento">Investimento</option></select><button onClick={addCat}>+ Adicionar</button></div>
          <div className="card">{cats.map(c=><div className="item" key={c.id||c.nome}><div style={{fontSize:22,width:32,textAlign:'center'}}>{c.emoji}</div><div className="item-info"><div className="item-desc">{c.nome}</div><div className="item-sub">{c.tipo==='receita'?'Entrada':c.tipo==='investimento'?'Investimento':'Saída'}</div></div>{c.id&&<button className="del-btn" onClick={()=>delCat(c.id,c.nome)}>×</button>}</div>)}</div>
        </div>
        <div className="sec" style={{marginTop:20}}><div className="sec-title">Backup</div><div className="bk-tip"><span>💡</span><span>Dados salvos na nuvem automaticamente.</span></div><div className="bk-grid"><button className="bk-btn pri" onClick={exportData}><span className="bi">📤</span>Exportar</button><button className="bk-btn" style={{background:'var(--r)',color:'#fff',borderColor:'var(--r)'}} onClick={async()=>{if(window.confirm('Apagar TODOS os dados?')){await sb.from('lancamentos').delete().eq('user_id',user.id);load();showT('🗑️ Apagado.')}}}><span className="bi">🗑️</span>Apagar tudo</button></div></div>
      </div>

      <button className="fab" onClick={openNew}>+</button>
      <div className={`toast${toastV?' show':''}`}>{toast}</div>

      {/* MODAL LANÇAMENTO / EDITAR */}
      {(modal==='lanc'||modal==='edit')&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div>
            <div className="modal-title">{modal==='edit'?'Editar lançamento':'Novo lançamento'}</div>
            <TT value={mTipo} onChange={cmt}/>
            <div className="form-card">
              <div className="ff"><label htmlFor="md">O quê</label><input id="md" placeholder="ex: biscoito, Netflix..." value={mDesc} onChange={e=>setMDesc(e.target.value)} autoComplete="off"/></div>
              <div className="ff"><label htmlFor="mv">Valor R$</label><input id="mv" type="number" inputMode="decimal" placeholder="0,00" value={mValor} onChange={e=>setMValor(e.target.value)}/></div>
              <div className="ff"><label htmlFor="mc">Categoria</label><select id="mc" value={mCat} onChange={e=>setMCat(e.target.value)}>{cats.filter(c=>c.tipo===mTipo).map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}</select></div>
              <div className="ff"><label htmlFor="mdt">Data</label><input id="mdt" type="date" value={mData} onChange={e=>setMData(e.target.value)}/></div>
              {mTipo==='despesa'&&cartoes.length>0&&<div className="ff"><label htmlFor="mcard">Cartão</label><select id="mcard" value={mCartao} onChange={e=>setMCartao(e.target.value)}><option value="">Débito / Dinheiro</option>{cartoes.map(c=><option key={c.id} value={c.id}>💳 {c.nome}</option>)}</select></div>}
            </div>
            {modal==='lanc'&&<div style={{background:'var(--bg)',borderRadius:'var(--rads)',border:'1px solid var(--border)',marginBottom:12,overflow:'hidden'}}><div className="ff" style={{cursor:'pointer'}} onClick={()=>setMParcOn(p=>!p)}><label style={{cursor:'pointer',flex:1,color:'var(--t2)'}}>🔄 Compra parcelada?</label><span style={{fontSize:13,color:'var(--t3)'}}>{mParcOn?'Sim':'Não'}</span><span style={{color:'var(--t3)',marginLeft:6}}>›</span></div>{mParcOn&&<div className="ff" style={{borderTop:'1px solid var(--border)'}}><label htmlFor="mp">Parcelas</label><input id="mp" type="number" inputMode="numeric" placeholder="ex: 12" min="2" max="60" value={mParcN} onChange={e=>setMParcN(e.target.value)} style={{fontFamily:'DM Mono,monospace'}}/></div>}</div>}
            <button className={`save-btn ${mTipo==='receita'?'rec':mTipo==='investimento'?'inv-btn':'des'}`} onClick={modal==='edit'?saveEdit:saveLanc} disabled={saving}>{saving?'Salvando...':modal==='edit'?'✅ Salvar alterações':`${TIPO_INFO[mTipo].icon} Salvar`}</button>
          </div>
        </div>
      )}

      {/* MODAL FIXO */}
      {modal==='fixo'&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div><div className="modal-title">Novo custo fixo</div>
            <TT value={fTipo} onChange={t=>{setFTipo(t);setFCat(cats.find(c=>c.tipo===t)?.nome||'')}}/>
            <div className="form-card">
              <div className="ff"><label htmlFor="fd">Nome</label><input id="fd" placeholder="ex: Plano de saúde" value={fDesc} onChange={e=>setFDesc(e.target.value)}/></div>
              <div className="ff"><label htmlFor="fv">Valor R$</label><input id="fv" type="number" inputMode="decimal" placeholder="0,00" value={fValor} onChange={e=>setFValor(e.target.value)}/></div>
              <div className="ff"><label htmlFor="fc">Categoria</label><select id="fc" value={fCat} onChange={e=>setFCat(e.target.value)}>{cats.filter(c=>c.tipo===fTipo).map(c=><option key={c.id||c.nome} value={c.nome}>{c.emoji} {c.nome}</option>)}</select></div>
              <div className="ff"><label htmlFor="fd2">Dia do mês</label><select id="fd2" value={fDia} onChange={e=>setFDia(e.target.value)}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></div>
            </div>
            <button className={`save-btn ${fTipo==='receita'?'rec':fTipo==='investimento'?'inv-btn':'des'}`} onClick={saveFixo} disabled={saving}>{saving?'Salvando...':'✅ Salvar fixo'}</button>
          </div>
        </div>
      )}

      {/* MODAL CARTÃO */}
      {modal==='cartao'&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div><div className="modal-title">Novo cartão</div>
            <div className="form-card">
              <div className="ff"><label htmlFor="cn">Nome</label><input id="cn" placeholder="ex: Nubank, Inter..." value={cNome} onChange={e=>setCNome(e.target.value)}/></div>
              <div className="ff"><label htmlFor="cb">Bandeira</label><select id="cb" value={cBand} onChange={e=>setCBand(e.target.value)}>{BANDEIRAS.map(b=><option key={b}>{b}</option>)}</select></div>
              <div className="ff"><label htmlFor="cl">Limite R$</label><input id="cl" type="number" inputMode="decimal" placeholder="Opcional" value={cLim} onChange={e=>setCLim(e.target.value)}/></div>
              <div className="ff"><label htmlFor="cf">Fechamento</label><select id="cf" value={cFech} onChange={e=>setCFech(e.target.value)}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></div>
              <div className="ff"><label htmlFor="cv">Vencimento</label><select id="cv" value={cVenc} onChange={e=>setCVenc(e.target.value)}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></div>
              <div className="ff"><label>Cor</label><div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{CORES_CARTAO.map(cor=><div key={cor} onClick={()=>setCCor(cor)} style={{width:24,height:24,borderRadius:'50%',background:cor,cursor:'pointer',border:cCor===cor?'3px solid var(--t1)':'3px solid transparent'}}></div>)}</div></div>
            </div>
            <button className="save-btn des" style={{background:'var(--b)'}} onClick={saveCartao} disabled={saving}>{saving?'Salvando...':'💳 Adicionar cartão'}</button>
          </div>
        </div>
      )}

      {/* MODAL PAGAR FATURA */}
      {modal==='pf'&&pfCartao&&(
        <div className="overlay open" onClick={e=>e.target.className==='overlay open'&&setModal(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-handle"></div><div className="modal-title">Pagar fatura</div>
            <div style={{background:'var(--bg)',borderRadius:'var(--rads)',padding:'14px 16px',marginBottom:12}}>
              <div style={{fontSize:13,color:'var(--t2)',marginBottom:4}}>💳 {pfCartao.nome} — {pfCartao.bandeira}</div>
              <div style={{fontSize:26,fontWeight:600,fontFamily:'DM Mono,monospace',color:'var(--r)'}}>{fmt(tcMes(pfCartao.id,pfMes))}</div>
              <div style={{fontSize:12,color:'var(--t3)',marginTop:4}}>{mLabel(pfMes)} · {gcMes(pfCartao.id,pfMes).length} lançamento(s)</div>
            </div>
            <div className="form-card">
              <div className="ff"><label htmlFor="pfm">Mês da fatura</label><select id="pfm" value={pfMes} onChange={e=>setPfMes(e.target.value)}>{mF.map(m=><option key={m} value={m}>{mLabel(m)}</option>)}</select></div>
              <div className="ff"><label htmlFor="pfd">Data pagamento</label><input id="pfd" type="date" value={pfData} onChange={e=>setPfData(e.target.value)}/></div>
            </div>
            <div style={{fontSize:12,color:'var(--t3)',marginBottom:12,lineHeight:1.5}}>💡 O valor será debitado do saldo na data do pagamento, sem duplicar os lançamentos individuais.</div>
            <button className="save-btn des" onClick={pagarFatura} disabled={saving}>{saving?'Salvando...':'✅ Confirmar pagamento'}</button>
          </div>
        </div>
      )}
    </>
  )
}
