"use strict";


const data = window.PsiNoteData;


const params = new URLSearchParams(window.location.search);


const patientName =
  params.get("paciente") || "Paciente";



const list =
  document.querySelector("#appointmentsList");





function formatDate(date){

  const p = date.split("-");

  return `${p[2]}/${p[1]}/${p[0]}`;

}





function renderPatient(){


  const profiles =
    data.getProfiles ? data.getProfiles() : [];


  const patient =
    profiles.find(
      p =>
        p.name === patientName ||
        p.fullName === patientName
    );



  const title =
    document.querySelector("#patientTitle");


  const name =
    document.querySelector("#patientName");


  if(title){

    title.textContent =
      `PERFIL DE ${patientName.toUpperCase()}`;

  }


  if(name){

    name.textContent =
      patientName;

  }



  if(!patient) return;



  document.querySelector("#patientEmail").textContent =
    patient.email || "Não informado";


  document.querySelector("#patientPhone").textContent =
    patient.phone ||
    patient.telephone ||
    "Não informado";


  document.querySelector("#patientLocation").textContent =
    patient.location ||
    patient.city ||
    "Não informado";



  const avatar =
    document.querySelector("#patientAvatar");


  if(avatar){

    if(patient.avatar){

      avatar.src = patient.avatar;

    }
    else if(patient.photo){

      avatar.src = patient.photo;

    }

  }


}





function updateTabsLinks(){


  const encodedPatient =
    encodeURIComponent(patientName);



  document
    .querySelectorAll(".patient-tabs a")
    .forEach(link=>{


      const page =
        link
        .getAttribute("href")
        .split("?")[0];


      link.href =
        `${page}?paciente=${encodedPatient}`;


    });


}







function renderAppointments(){


  const appointments =

    data.getAppointments()

      .filter(
        item =>
          item.patient === patientName &&
          item.status !== "cancelled"
      )

      .sort(
        (a,b)=>
          (a.date+a.time)
          .localeCompare(
            b.date+b.time
          )
      );




  list.innerHTML = "";




  if(!appointments.length){


    list.innerHTML = `

      <div class="consulta-item">

        <i data-lucide="calendar-x"></i>

        <div class="consulta-data">

          <strong>
            Nenhuma consulta encontrada
          </strong>

          <span>
            Este paciente ainda não possui consultas.
          </span>

        </div>

      </div>

    `;


    lucide.createIcons();

    return;

  }






  appointments.forEach(item=>{


    const div =
      document.createElement("div");


    div.className =
      "consulta-item";



    div.innerHTML = `


      <i data-lucide="calendar"></i>



      <div class="consulta-data">


        <strong>
          ${formatDate(item.date)}
        </strong>


        <span>
          ${item.time} • ${item.mode}
        </span>


      </div>




      <div class="consulta-action">


        <i data-lucide="message-square"></i>


        Abrir Notas


      </div>





      <div class="consulta-action">


        <i data-lucide="file-text"></i>


        Abrir Relatórios


      </div>





      <a 
        class="consulta-arrow"
        href="consulta.html?id=${item.id}&paciente=${encodeURIComponent(patientName)}"
      >

        ›

      </a>



    `;



    list.appendChild(div);



  });




  lucide.createIcons();



}









function init(){


  renderPatient();


  renderAppointments();


  updateTabsLinks();



}



init();