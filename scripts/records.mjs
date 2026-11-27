// Materialize country, software and edition comparisons from two distinct FediDB exports.
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {join,relative,dirname} from "node:path";
import {pathToFileURL} from "node:url";
const stage=process.argv[2], base="https://coolcode.ca/fedifootprint/";
const {summarize,ranked,fmt,percent,share,change,named,recordPath,slug,comparison,preset,indexNames,topShare}=await import(pathToFileURL(join(stage,"model.mjs")));
const archive=JSON.parse(readFileSync(join(stage,"data/archive.json"),"utf8")),eds=archive.editions;
const dates=Object.keys(eds).sort(),latest=dates.at(-1),points=new Set();
if(!latest)throw Error("Missing published weekly editions");
const countries=indexNames(archive,"country"),software=indexNames(archive,"software");
const modes={countries:"country",software:"software"};
const cached=new Map();
function summary(date,kind,value=null){
  const key=JSON.stringify([date,kind,value]);
  if(!cached.has(key))cached.set(key,summarize(eds[date],kind,value));
  return cached.get(key);
}
const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const link=(url,label)=>'<a href="'+esc(url)+'">'+esc(label)+'</a>';
const grid=links=>'<div class="indexlinks">'+links.join("")+'</div>';
const sources=(e)=>'<p>FediDB’s dated files: '+link(e.sources.countries.url,"country/software export")+' · '+link(e.sources.servers.url,"server-directory export")+'.</p>';
const method='<footer><p>Source: '+link("https://fedidb.com/datasets","FediDB weekly datasets")+' under '+link("https://creativecommons.org/licenses/by/4.0/","CC BY 4.0")+'. CoolCode aggregates counts and calculates shares. Hosting country describes a server’s location. Accounts can belong to the same person. Monthly activity windows overlap.</p>'+link("https://github.com/jsdyer/fedifootprint#reading-the-figures","How to read the figures")+' · '+link("https://fedidb.com/resources/data-sources","FediDB collection method")+'</footer>';
function table(caption,headers,rows) {
  return '<div class="scroll"><table><caption>'+esc(caption)+'</caption><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join("")+'</tr></thead><tbody>'+rows.map(cells=>'<tr><th scope="row">'+cells[0]+'</th>'+cells.slice(1).map(c=>'<td>'+c+'</td>').join("")+'</tr>').join("")+'</tbody></table></div>';
}
function emit(path,title,description,body,type="Article"){
  if(points.has(path))throw Error("Duplicate public path: "+path);
  points.add(path);
  const dest=join(stage,path,"index.html"),canonical=base+path;
  // @ links are local site-root paths; keep the generated site portable under a subpath.
  const local=markup=>markup.replace(/href="@([^"]*)"/g,(_,ref)=>{
    const i=ref.indexOf("?"),p=i<0?ref:ref.slice(0,i),q=i<0?"":ref.slice(i);
    const relativePath=relative(dirname(dest),join(stage,p)).replaceAll("\\","/")||".";
    return 'href="'+relativePath+'/'+q+'"';
  });
  const schema=JSON.stringify({"@context":"https://schema.org","@type":type,name:title,url:canonical,description,
    isPartOf:{"@type":"WebApplication",name:"FediFootprint",url:base},citation:"https://fedidb.com/datasets"}).replaceAll("<","\\u003c");
  const css=relative(dirname(dest),join(stage,"style.css")).replaceAll("\\","/");
  mkdirSync(dirname(dest),{recursive:true});
  writeFileSync(dest,'<!doctype html><html lang="en-CA"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+' · FediFootprint</title><meta name="description" content="'+esc(description)+'"><meta property="og:title" content="'+esc(title)+'"><meta property="og:description" content="'+esc(description)+'"><meta property="og:url" content="'+canonical+'"><link rel="canonical" href="'+canonical+'"><link rel="stylesheet" href="'+css+'"><script type="application/ld+json">'+schema+'</script></head><body class="recordpage"><header><nav>'+local(link("@","FediFootprint")+link("@records/","All records ↗"))+'</nav></header><main><h1>'+esc(title)+'</h1><p class="lead">'+esc(description)+'</p>'+local(body)+method+'</main></body></html>');
}
const route=(kind,label)=>link("@"+recordPath(kind,label),kind==="software"?named(label):label);
function directoryCohort(c) {
  if(!c)return '<p>This server-directory export has no matching cohort.</p>';
  const n=c.top.length;
  const concentration=n?fmt(n)+' of '+fmt(c.servers)+' listed domains ('+percent(share(n,c.servers))+') account for '+percent(topShare(c))+' of reported monthly active accounts in this directory cohort.':'There is no positive reported monthly activity to rank.';
  let out='<p class="highlight">'+esc(concentration)+'</p><p>'+fmt(c.reporting)+' of '+fmt(c.servers)+' domains reported activity, totalling '+fmt(c.active)+' monthly active accounts. '+fmt(c.servers-c.reporting)+' omitted that measure. The separate server-directory export covers listed servers seen within 30 days with at least two accounts.</p>';
  if(n)out+=table("Largest reporting domains in this cohort",["Server domain","Monthly active accounts","Share of reported activity"],c.top.map(([h,a])=>[esc(h),fmt(a),esc(percent(share(a,c.active)))]));
  return out;
}
function ranking(s,otherKind,caption,by) {
  const rows=ranked(s,by);
  return table(caption,["Name","Servers","Server share","Monthly active accounts","Active share"],rows.map(r=>[
    route(otherKind,r.name),fmt(r.servers),esc(percent(share(r.servers,s.totals.servers))),fmt(r.active),esc(percent(share(r.active,s.totals.active))) ]));
}
function movement(current,prev,date) {
  if(!prev || !prev.groups.size)return '<p>No matching preceding export is available for calculating change.</p>';
  return '<p>Since '+esc(date)+', the published counts changed by <strong>'+change(current.totals.servers)+' servers</strong> and <strong>'+change(current.totals.active)+' monthly active accounts</strong>.</p>';
}
function quickCountry(country){
  return countries.includes(country)?country:countries[0];
}
const countryA=quickCountry("Canada"),countryB=countries.includes("Germany")?"Germany":countries.find(c=>c!==countryA)||countryA;
const defaultSoftware=software.includes("mastodon")?"mastodon":software[0];
for(const [folder,names] of [["countries",countries],["software",software]]) {
  const kind=modes[folder],otherKind=folder==="countries"?"software":"countries";
  const paths=new Set(names.map(slug));
  if(paths.size!==names.length || paths.has(""))throw Error("Ambiguous public labels: "+folder);
  for(const val of names){
    const valid=dates.filter(d=>summary(d,kind,val).groups.size);
    const day=valid.at(-1),prev=dates[dates.indexOf(day)-1],s=summary(day,kind,val),prior=prev?summary(prev,kind,val):null;
    const byServers=ranked(s,"servers")[0],byActive=ranked(s,"active")[0];
    const label=folder==="software"?named(val):val, title=folder==="countries"?"Fediverse hosting in "+label:label+" hosting footprint";
    const connected=folder==="countries"?s.groups.size+" software labels":s.groups.size+" hosting-country labels";
    const desc="On "+day+", FediDB’s country export listed "+fmt(s.totals.servers)+" servers and "+fmt(s.totals.active)+" monthly active accounts across "+connected+" for "+label+".";
    const country=folder==="countries"?val:byServers.name,soft=folder==="software"?val:byServers.name;
    let body='<p>'+link("@"+preset(day,country,country===countryA?countryB:countryA,soft),"Open this selection in the comparison")+'</p>';
    if(day!==latest)body+='<p class="highlight">Last published observation '+day+'. This label has no country/software row in the latest retained export ('+latest+').</p>';
    body+=movement(s,prior,prev);
    if(s.totals.active>0)body+='<p>'+route(otherKind,byServers.name)+' has the largest server count ('+percent(share(byServers.servers,s.totals.servers))+'). '+route(otherKind,byActive.name)+' has the largest monthly active account count ('+percent(share(byActive.active,s.totals.active))+'). Values use this profile’s country-export totals.</p>';
    body+='<h2>Weekly history</h2>'+table("Country-export observations",["Export","Servers","Total accounts","Monthly active accounts"],dates.slice().reverse().map(d=>{
      const record=summary(d,kind,val);return [route("weeks",d),...(record.groups.size?[fmt(record.totals.servers),fmt(record.totals.users),fmt(record.totals.active)]:["—","—","—"])];
    }));
    body+='<h2>'+(otherKind==="countries"?"Hosting countries":"Software running here")+'</h2>'+ranking(s,otherKind,"Shares within "+label+" · "+day,"servers");
    body+='<h2>How concentrated is reported activity?</h2>'+directoryCohort(eds[day].servers[kind][val])+sources(eds[day]);
    emit(recordPath(folder,val),title,desc,body);
  }
}
for(const [i,d] of dates.entries()){
  const e=eds[d],co=summary(d,"country"),sw=summary(d,"software"),p=dates[i-1],largest=ranked(co,"servers")[0],mostActive=ranked(co,"active")[0],topPlatform=ranked(sw,"active")[0];
  const desc=fmt(co.totals.servers)+" servers and "+fmt(co.totals.active)+" monthly active accounts appear across "+co.groups.size+" hosting-country labels in FediDB’s "+d+" country export.";
  let body=movement(co,p?summary(p,"country"):null,p)+'<p class="highlight">'+route("countries",largest.name)+' has the largest server count. '+route("countries",mostActive.name)+' has the most reported monthly active accounts. '+route("software",topPlatform.name)+' accounts for '+percent(share(topPlatform.active,co.totals.active))+' of the country export’s monthly active accounts.</p>';
  body+=table("Published totals from separate exports",["Export","Servers","Reported monthly active accounts"],[["Country/software",fmt(co.totals.servers),fmt(co.totals.active)],["Server directory",fmt(e.servers.all.servers),fmt(e.servers.all.active)]]);
  body+='<h2>Hosting-country distribution</h2>'+ranking(co,"countries","All published countries, sorted by number of servers","servers");
  body+='<h2>Worldwide directory concentration</h2>'+directoryCohort(e.servers.all);
  if(e.servers.unlocated)body+='<p>'+fmt(e.servers.unlocated.servers)+' directory rows did not list a hosting country.</p>';
  if(p)body+='<p>'+route("weeks",p)+' · '+link("@"+preset(d,countryA,countryB,defaultSoftware),"Compare countries for this edition")+'</p>';
  emit(recordPath("weeks",d),"Fediverse hosting on "+d,desc,body+sources(e));
}
const mainCountries=summary(latest,"country"),example=comparison(eds[latest],countryA,defaultSoftware);
let dir='<p class="highlight">Start with '+route("countries",countryA)+', see where '+route("software",defaultSoftware)+' is hosted, or inspect '+route("weeks",latest)+'.</p>';
dir+='<h2>Weekly exports</h2>'+grid(dates.slice().reverse().map(d=>route("weeks",d)))+'<h2>Hosting countries</h2>'+grid(countries.map(c=>route("countries",c)))+'<h2>Software</h2>'+grid(software.map(s=>route("software",s)));
emit("records/","Fediverse hosting records","Browse "+countries.length+" hosting-country labels, "+software.length+" software labels and "+dates.length+" dated FediDB exports. Historical profiles retain their latest observed date.",dir,"CollectionPage");
const page=join(stage,"index.html");
let html=readFileSync(page,"utf8");
for(const [field,items,defaultValue] of [["week",dates.slice().reverse(),latest],["country",countries,countryA],["other",countries,countryB],["software",software,defaultSoftware]])
  html=html.replace("<!--"+field+"-->",items.map(s=>'<option value="'+esc(s)+'"'+(s===defaultValue?" selected":"")+'>'+esc(field==="software"?named(s):s)+'</option>').join(""));
const defaultResult='<p class="resultlead">'+esc(named(defaultSoftware))+' · '+latest+' · share within each hosting country</p><div class="cards">'+[countryA,countryB].map(c=>{
  const x=comparison(eds[latest],c,defaultSoftware);
  if(!x.row)return '<article class="card"><h3>'+esc(c)+'</h3><p>This pair has no published row.</p></article>';
  return '<article class="card"><h3>'+esc(c)+'</h3><p>Server share: <strong>'+esc(percent(x.serverShare))+'</strong> ('+fmt(x.row.servers)+' of '+fmt(x.totals.servers)+').</p><p>Monthly active account share: <strong>'+esc(percent(x.activeShare))+'</strong> ('+fmt(x.row.active)+' of '+fmt(x.totals.active)+').</p>'+link("./"+recordPath("countries",c),"Read the country record")+'</article>';
}).join("")+'</div><p>'+link("./"+recordPath("software",defaultSoftware),"Explore "+named(defaultSoftware))+' · '+link("./"+recordPath("weeks",latest),"See this weekly export")+'</p>';
writeFileSync(page,html.replace("<!--example-->",defaultResult));
writeFileSync(join(stage,"sitemap.xml"),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+[...points].sort().map(p=>'  <url><loc>'+esc(base+p)+'</loc></url>').join("\n")+'\n</urlset>\n');
const status={checked_at:archive.checked_at,latest,earliest:dates[0],editions:dates.length,country_software_rows:eds[latest].countries.length,represented_servers:mainCountries.totals.servers,monthly_active_accounts:mainCountries.totals.active,server_directory_rows:eds[latest].servers.all.servers,country_profiles:countries.length,software_profiles:software.length,sitemap_pages:points.size};
writeFileSync(join(stage,"data/status.json"),JSON.stringify(status,null,2)+"\n");
console.log(JSON.stringify(status));
