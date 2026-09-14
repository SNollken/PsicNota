"use strict";
(function(){
  const data=window.PsiNoteData;
  const session=data.getSession();
  const profiles=data.getProfiles();
  const byId=session?.id&&profiles.find(item=>item.id===session.id);
  const byEmail=session?.email&&profiles.find(item=>item.email&&item.email.toLowerCase()===session.email.toLowerCase());
  let latestProfile=null;
  try { latestProfile=JSON.parse(localStorage.getItem("psinoteProfileDemo")||"null"); } catch { latestProfile=null; }
  const profile=byId||byEmail||latestProfile||profiles.find(item=>item.role==="paciente"||item.role==="patient")||null;
  const patientId=profile?.id||session?.id||"demo-paciente";
  const patientName=profile?.socialName||profile?.fullName||profile?.name||session?.fullName||session?.name||"Paciente PsicNota";
  document.getElementById("patientFirstName").textContent=String(patientName).trim().split(/\s+/)[0];

  const appointments=data.getAppointments().filter(item=>Boolean(patientId)&&(item.patientId===patientId||item.patient===patientName)&&item.status!=="cancelled");
  const now=new Date();
  const today=data.toDateKey(now);
  const upcoming=appointments.filter(item=>new Date(item.date+"T"+item.time+":00")>=now).sort((a,b)=>(a.date+" "+a.time).localeCompare(b.date+" "+b.time));
  document.getElementById("todayCount").textContent=String(appointments.filter(item=>item.date===today).length);
  const notes=data.getNotes();
  document.getElementById("notesCount").textContent=String(appointments.filter(item=>String(notes["appt:"+item.id]||"").trim()).length);

  const weekday=new Intl.DateTimeFormat("pt-BR",{weekday:"long"});
  const longDate=new Intl.DateTimeFormat("pt-BR",{day:"numeric",month:"long"});
  const monthShort=new Intl.DateTimeFormat("pt-BR",{month:"short"});
  function dateOf(item){return data.fromDateKey(item.date)}
  function modeOf(item){return String(item.mode||"").toLowerCase().includes("online")?"Consulta online":"Consulta presencial"}
  const next=document.getElementById("nextAppointment");
  if(upcoming.length){
    const item=upcoming[0];
    const icon=document.createElement("span");icon.className="next-icon";icon.setAttribute("aria-hidden","true");
    icon.innerHTML='<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>';
    const detail=document.createElement("div");
    const line=document.createElement("strong");line.textContent=weekday.format(dateOf(item))+", "+longDate.format(dateOf(item))+" - "+item.time;
    const mode=document.createElement("p");mode.textContent=modeOf(item);
    const clinician=document.createElement("p");clinician.textContent=item.psychologist?"com "+item.psychologist:"";
    detail.append(line,mode);if(clinician.textContent)detail.append(clinician);
    next.append(icon,detail);
  }else{
    const empty=document.createElement("p");empty.className="empty-message";empty.textContent="Nenhuma consulta agendada.";next.append(empty);
  }
  const list=document.getElementById("upcomingAppointments");
  if(upcoming.length){
    upcoming.slice(0,3).forEach(item=>{
      const li=document.createElement("li");
      const badge=document.createElement("span");badge.className="date-badge";
      const month=document.createElement("small");month.textContent=monthShort.format(dateOf(item)).replace(".","").toUpperCase();
      const day=document.createElement("strong");day.textContent=String(dateOf(item).getDate()).padStart(2,"0");badge.append(month,day);
      const detail=document.createElement("span");detail.className="upcoming-detail";
      const line=document.createElement("strong");line.textContent=weekday.format(dateOf(item))+" - "+item.time;
      const mode=document.createElement("span");mode.textContent=modeOf(item);
      detail.append(line,mode);li.append(badge,detail);list.append(li);
    });
  }else{
    const li=document.createElement("li");li.className="empty-message";li.textContent="Nenhuma consulta futura.";list.append(li);
  }

  const contact=document.getElementById("contactClinic");
  contact.addEventListener("click",()=>{
    const clinicEmail=profiles.find(item=>item.role==="psicologo"&&item.email)?.email;
    if(clinicEmail){window.location.href="mailto:"+encodeURIComponent(clinicEmail);return}
    const message=document.getElementById("contactMessage");message.textContent="Contato da clínica indisponível. Consulte sua agenda para informações da consulta.";message.hidden=false;
  });
  const menuButton=document.querySelector(".mobile-menu");
  const sidebar=document.querySelector(".sidebar");
  if(menuButton&&sidebar){
    menuButton.addEventListener("click",()=>menuButton.setAttribute("aria-expanded",String(sidebar.classList.toggle("open"))));
    document.addEventListener("click",event=>{if(window.innerWidth<=720&&!sidebar.contains(event.target)&&!menuButton.contains(event.target)){sidebar.classList.remove("open");menuButton.setAttribute("aria-expanded","false")}});
  }
}());
