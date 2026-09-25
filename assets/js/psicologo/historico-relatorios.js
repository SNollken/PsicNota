"use strict";


const data = window.PsiNoteData;


const params =
new URLSearchParams(window.location.search);


const patientId =
  params.get("id") || "";


const patientName =
  params.get("paciente") || "Paciente";


const menuButton = document.querySelector(".mobile-menu");
const sidebar = document.querySelector(".sidebar");
if (menuButton && sidebar) {
  menuButton.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (window.innerWidth <= 1024 && !sidebar.contains(event.target) && !menuButton.contains(event.target)) {
      sidebar.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}


const elements = {



title:
document.querySelector("#patientTitle"),


name:
document.querySelector("#patientName"),


avatar:
document.querySelector("#patientAvatar"),


email:
document.querySelector("#patientEmail"),


phone:
document.querySelector("#patientPhone"),


location:
document.querySelector("#patientLocation"),


list:
document.querySelector("#reportsHistoryList"),


empty:
document.querySelector("#reportsEmpty"),


button:
document.querySelector("#loadMoreButton")


};



let reports = [];

let visible = 8;





function formatDate(date){


return new Intl.DateTimeFormat(
"pt-BR"
)

.format(
new Date(date)
);


}






function renderPatient(){


const patient =
data.getProfiles()
.find(
p =>
(patientId && p.id === patientId) ||
p.name === patientName ||
p.fullName === patientName
);



elements.title.textContent =
`PERFIL DE ${patientName.toUpperCase()}`;


elements.name.textContent =
patientName;



if(!patient)return;



elements.email.textContent =
patient.email || "Não informado";


elements.phone.textContent =
patient.phone || "Não informado";


elements.location.textContent =
patient.location || "Não informado";



if(patient.avatar){

elements.avatar.src =
patient.avatar;

}



}







function getReports(){


return data.getReports()

.filter(
report =>
(patientId ? report.patientId === patientId : report.patient === patientName)
)

.sort(
(a,b)=>
new Date(b.createdAt)
-
new Date(a.createdAt)
);


}







function createReport(report){


const item =
document.createElement("div");


item.className =
"report-history-item";



item.innerHTML = `


<div class="report-history-icon">

<i data-lucide="file-text"></i>

</div>



<div class="report-history-content">


<strong class="report-history-date">

${formatDate(report.createdAt)}

</strong>


<p class="report-history-text">

Relatório pós-consulta disponível

</p>


</div>



<div class="report-history-arrow">

<i data-lucide="chevron-right"></i>

</div>


`;



item.onclick = ()=>{


window.location.href =
`relatorio.html?id=${report.id}&paciente=${encodeURIComponent(patientName)}`;


};



return item;


}








function renderReports(){


elements.list.innerHTML="";



if(!reports.length){


elements.empty.hidden=false;

elements.button.hidden=true;


lucide.createIcons();

return;


}



elements.empty.hidden=true;



reports
.slice(0,visible)

.forEach(report=>{


elements.list.append(
createReport(report)
);


});



elements.button.hidden =
visible >= reports.length;



lucide.createIcons();


}







elements.button.onclick = ()=>{


visible += 8;


renderReports();


};








function updateTabs(){


const idParam = patientId ? `id=${encodeURIComponent(patientId)}&` : "";

document
.querySelectorAll(".patient-tabs a")
.forEach(link=>{

if (link.dataset.patientDetails !== undefined) return;


const page =
link.href.split("?")[0];

const isAppointmentsLink = page === "historico-consultas.html" || link.textContent.trim() === "Consultas";
const targetPage = isAppointmentsLink ? "paciente-perfil.html" : page;
const targetTab = isAppointmentsLink ? "appointments" : (page === "paciente-perfil.html" ? "details" : "");


link.href =
`${targetPage}?${idParam}paciente=${encodeURIComponent(patientName)}${targetTab ? `&aba=${targetTab}` : ""}`;


});


}







async function init(){

const _auth = await window.PsicNotaBackend.requireProfile("psicologo");
if (!_auth) return;

await data.syncRemoteData();

renderPatient();


reports =
getReports();


  updateTabs();

  const encodedPatient = encodeURIComponent(patientName);
  const idParam = patientId ? `id=${encodeURIComponent(patientId)}&` : "";

  const primaryBtn = document.querySelector(".patient-actions .primary");
  if (primaryBtn) {
    primaryBtn.style.cursor = "pointer";
    primaryBtn.addEventListener("click", () => {
      const appts = data.getAppointments().filter(item =>
        (patientId ? item.patientId === patientId : item.patient === patientName) &&
        data.hasAppointmentNote(item.id)
      );
      if (appts.length) {
        window.location.href = `notas.html?consulta=${encodeURIComponent(appts[0].id)}`;
      } else {
        window.location.href = `historico-notas.html?${idParam}paciente=${encodedPatient}`;
      }
    });
  }

  const outlineBtn = document.querySelector(".patient-actions .outline");
  if (outlineBtn) {
    outlineBtn.style.cursor = "pointer";
    outlineBtn.addEventListener("click", () => {
      window.location.href = "agenda-psicologo.html";
    });
  }

  renderReports();


}



void init();
