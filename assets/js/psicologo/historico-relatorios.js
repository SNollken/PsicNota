"use strict";


const data = window.PsiNoteData;


const params =
new URLSearchParams(window.location.search);



const patientName =
params.get("paciente") || "Paciente";



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
report.patient === patientName
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


document
.querySelectorAll(".patient-tabs a")
.forEach(link=>{


const page =
link.href.split("?")[0];


link.href =
`${page}?paciente=${encodeURIComponent(patientName)}`;


});


}







function init(){


renderPatient();


reports =
getReports();


updateTabs();


renderReports();


}



init();