export const fmt = number => Number.isFinite(number) ? Math.round(number).toLocaleString("en-CA") : "—";
export const share = (n,d) => Number.isFinite(n) && d > 0 ? n * 100 / d : null;
export const percent = n => n === null || !Number.isFinite(n) ? "—" : n > 0 && n < .05 ? "<0.1%" : n.toFixed(1)+"%";
export const change = n => n == null ? "—" : (n>0?"+":"")+fmt(n);
export const named = s => s==="mastodon" ? "Mastodon" : s==="misskey" ? "Misskey" : s==="pixelfed" ? "Pixelfed" : s;
export const slug = name => name.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
export const recordPath = (kind,name) => "records/"+kind+"/"+slug(name)+"/";
export function summarize(edition,kind,value) {
  const key=kind==="country"?0:1, groups=new Map(), totals={servers:0,users:0,active:0};
  for (const row of edition.countries) {
    if(value != null && row[key]!==value) continue;
    const other=row[value==null ? key : 1-key];
    if(!groups.has(other)) groups.set(other,{name:other,servers:0,users:0,active:0});
    const result=groups.get(other);
    for(const [i,field] of ["servers","users","active"].entries()) {
      result[field]+=row[i+2]; totals[field]+=row[i+2];
    }
  }
  return {totals,groups};
}
export function ranked(summary,by="servers") {
  return [...summary.groups.values()].sort((a,b)=>b[by]-a[by] || a.name.localeCompare(b.name));
}
export function comparison(edition,country,software) {
  const summary=summarize(edition,"country",country), part=summary.groups.get(software);
  return {country,software,totals:summary.totals,row:part ?? null,
    serverShare:part ? share(part.servers,summary.totals.servers):null,
    activeShare:part ? share(part.active,summary.totals.active):null};
}
export function indexNames(archive,kind) {
  const key=kind==="country"?0:1,names=new Set();
  for(const ed of Object.values(archive.editions)) for(const r of ed.countries) names.add(r[key]);
  return [...names].sort((a,b)=>a.localeCompare(b));
}
export function topShare(cohort) {
  return cohort ? share(cohort.top.reduce((n,r)=>n+r[1],0),cohort.active) : null;
}
export function preset(week,country,other,software) {
  return "?"+new URLSearchParams({week,country,other,software}).toString();
}
export const previousDate = (dates,current) => dates[dates.indexOf(current)-1] || null;
