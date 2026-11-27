import {comparison,change,fmt,named,percent,preset,previousDate,recordPath} from "./model.mjs";
const get=id=>document.getElementById(id);
const create=(tag,text,cls)=>{const el=document.createElement(tag);if(text!=null)el.textContent=text;if(cls)el.className=cls;return el};
const anchor=(url,label)=>{const a=create("a",label);a.href=url;return a};
function card(current,prior,previous) {
  const el=create("article",null,"card");
  el.append(create("h3",current.country));
  if(current.row){
    for(const [label,part,denominator,value,style] of [
      ["Server share",current.row.servers,current.totals.servers,current.serverShare,""],
      ["Monthly active account share",current.row.active,current.totals.active,current.activeShare,"active"]]){
      const metric=create("div",null,"metric");
      metric.append(create("span",label),create("strong",percent(value)));
      const bar=create("div",null,"bar "+style),fill=create("span");fill.style.width=(value||0)+"%";bar.append(fill);
      el.append(metric,bar,create("p",fmt(part)+" of "+fmt(denominator),"detail"));
    }
    const delta=previous && prior?.row ? "Since "+previous+": "+change(current.row.servers-prior.row.servers)+" servers, "+change(current.row.active-prior.row.active)+" monthly active accounts." : "No earlier matching observation for this comparison.";
    el.append(create("p",delta,"detail"));
  }else el.append(create("p","This country/software pair has no published row in the selected export."));
  el.append(anchor("./"+recordPath("countries",current.country),"Read the country record"));
  return el;
}
try {
  const req=await fetch("./data/archive.json");if(!req.ok)throw Error();
  const {editions}=await req.json(),dates=Object.keys(editions).sort();
  const params=new URLSearchParams(location.search),fields=["week","country","other","software"];
  function restore() {
    for(const field of fields){
      const el=get(field), value=params.get(field);
      if(value && [...el.options].some(o=>o.value===value))el.value=value;
    }
  }
  function draw(write=false){
    const [week,country,other,software]=fields.map(k=>get(k).value),prev=previousDate(dates,week);
    const cards=create("div",null,"cards");
    for(const c of new Set([country,other]))cards.append(card(comparison(editions[week],c,software),prev&&comparison(editions[prev],c,software),prev));
    const lead=create("p",named(software)+" · "+week+" · share within each hosting country","resultlead");
    const nav=create("p");nav.append(anchor("./"+recordPath("software",software),"Explore "+named(software)),document.createTextNode(" · "),anchor("./"+recordPath("weeks",week),"See this weekly export"));
    get("result").replaceChildren(lead,cards,nav);
    if(write) history.replaceState(null,"",preset(week,country,other,software));
  }
  restore();draw();
  for(const name of fields)get(name).addEventListener("change",()=>draw(true));
}catch{get("notice").textContent="The interactive data could not load. The example and published records below are available."}
