"use strict";

(function () {

const data = window.PsiNoteData;


const session = data.getSession();

const profiles = data.getProfiles();


const profile =
profiles.find(item => item.id === session?.id) ||
profiles.find(item => item.role === "paciente") ||
null;



const patientName =
profile?.socialName ||
profile?.fullName ||
profile?.name ||
"Paciente";



document.getElementById("patientFirstName").textContent =
patientName.split(" ")[0];





/* =========================
   CONTADORES
========================= */


const appointments = data.getAppointments()
.filter(item =>
item.patientId === profile?.id &&
item.status !== "cancelled"
);



const today = data.toDateKey(new Date());


document.getElementById("todayCount").textContent =
appointments.filter(item=>item.date===today).length;



const notes = data.getNotes();



document.getElementById("notesCount").textContent =
String(Object.keys(notes).length);








/* =========================
   PROXIMA CONSULTA
========================= */


const upcoming =
appointments
.filter(item =>
new Date(item.date+"T"+item.time+":00") >= new Date()
)
.sort((a,b)=>
(a.date+a.time).localeCompare(b.date+b.time)
);



const nextBox =
document.getElementById("nextAppointment");



if(upcoming.length){


const item = upcoming[0];


nextBox.innerHTML = `


<div class="calendar-circle">

<svg viewBox="0 0 24 24">
<rect x="3" y="5" width="18" height="16" rx="2"/>
<path d="M3 9h18M8 3v4M16 3v4"/>
</svg>

</div>


<div class="next-info">

<strong>
Quinta - feira, 22 de maio - ${item.time}
</strong>


<span>
Consulta online
</span>


<span>
com ${item.psychologist || "Letícia Martins"}
</span>



<div class="next-buttons">

<button class="enter">
Entrar na consulta
</button>


<button>
Ver detalhes
</button>


</div>


</div>


`;


}else{


nextBox.innerHTML = `

<p class="empty-message">
Nenhuma consulta agendada.
</p>

`;

}





/* =========================
   CONSULTAS FUTURAS
========================= */


const list =
document.getElementById("upcomingAppointments");



list.innerHTML="";



if(upcoming.length){


upcoming.slice(0,3).forEach(item=>{


const date =
data.fromDateKey(item.date);



const month =
new Intl.DateTimeFormat(
"pt-BR",
{month:"short"}
)
.format(date)
.replace(".","")
.toUpperCase();



const day =
String(date.getDate())
.padStart(2,"0");



const li=document.createElement("li");



li.innerHTML=`


<span class="date-badge">

<small>${month}</small>

<strong>${day}</strong>

</span>



<span class="upcoming-detail">

<strong>
Quinta - feira - ${item.time}
</strong>

<span>
Consulta online
</span>


</span>


`;



list.appendChild(li);



});


}else{


list.innerHTML=`

<li class="empty-message">
Nenhuma consulta futura.
</li>

`;

}




/* =========================
   MENU MOBILE
========================= */


const menuButton =
document.querySelector(".mobile-menu");


const sidebar =
document.querySelector(".sidebar");



if(menuButton && sidebar){


menuButton.addEventListener(
"click",
()=>{

sidebar.classList.toggle("open");

}

);


}



})();