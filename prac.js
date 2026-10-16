const MOTOR = "http://TU_IP:8081";

let ejercicio = null;
let preguntaActual = 0;


// =====================================================
// ELEMENTOS
// =====================================================

const circuito = document.getElementById("circuito");
const preguntas = document.getElementById("preguntas");
const resultado = document.getElementById("resultado");


// =====================================================
// GENERAR EJERCICIO
// =====================================================

async function generarEjercicio(dificultad = 1){

    resultado.textContent = "Generando ejercicio...";

    try{

        const respuesta = await fetch(
            MOTOR + "/generar",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    dificultad: dificultad
                })
            }
        );


        if(!respuesta.ok){

            throw new Error(
                "HTTP " + respuesta.status
            );
        }


        ejercicio = await respuesta.json();

        preguntaActual = 0;

        dibujarCircuito();

        mostrarPreguntas();

        resultado.textContent =
            "Ejercicio generado.";

    }

    catch(error){

        console.error(error);

        resultado.textContent =
            "No se pudo conectar con el motor C++.";
    }
}


// =====================================================
// DIBUJAR CIRCUITO
// =====================================================

function dibujarCircuito(){

    circuito.innerHTML = "";


    if(!ejercicio ||
       !ejercicio.componentes){

        return;
    }


    const componentes =
        ejercicio.componentes;


    /*
        Contenedor visual.
    */

    const contenedor =
        document.createElement("div");

    contenedor.className =
        "circuito-contenedor";


    componentes.forEach((componente, indice) => {

        const elemento =
            crearComponente(
                componente,
                indice
            );


        contenedor.appendChild(elemento);


        /*
            Una línea visual entre componentes.
            Esto es solamente representación.
            La conexión eléctrica real vendrá
            posteriormente desde nodoA/nodoB.
        */

        if(indice < componentes.length - 1){

            const linea =
                document.createElement("div");

            linea.className =
                "circuito-linea";

            contenedor.appendChild(linea);
        }

    });


    circuito.appendChild(contenedor);
}


// =====================================================
// CREAR COMPONENTE
// =====================================================

function crearComponente(componente, indice){

    const elemento =
        document.createElement("div");

    elemento.className =
        "componente";


    elemento.dataset.id =
        componente.id;


    elemento.dataset.tipo =
        componente.tipo;


    /*
        BATERÍA
    */

    if(componente.tipo === "bateria"){

        elemento.innerHTML = `
            <div class="bateria">
                <div class="polo positivo">+</div>
                <div class="bateria-cuerpo">
                    🔋
                </div>
                <div class="polo negativo">−</div>
            </div>

            <div class="nombre">
                Batería
            </div>
        `;
    }


    /*
        RESISTENCIA
    */

    else if(componente.tipo === "resistencia"){

        elemento.innerHTML = `
            <div class="resistencia">
                /\\/\\/\\
            </div>

            <div class="nombre">
                R${componente.id}
            </div>

            <div class="dato">
                ${componente.r} Ω
            </div>
        `;
    }


    /*
        LED
    */

    else if(componente.tipo === "led"){

        elemento.innerHTML = `
            <div class="led">
                💡
            </div>

            <div class="nombre">
                LED ${componente.id}
            </div>

            <div class="dato">
                ${componente.v} V
            </div>
        `;
    }


    else{

        elemento.textContent =
            componente.tipo;
    }


    return elemento;
}


// =====================================================
// MOSTRAR PREGUNTAS
// =====================================================

function mostrarPreguntas(){

    preguntas.innerHTML = "";


    if(!ejercicio ||
       !ejercicio.preguntas){

        return;
    }


    ejercicio.preguntas.forEach(
        (pregunta, indice) => {

            const componente =
                buscarComponente(
                    pregunta.id
                );


            const bloque =
                document.createElement("div");


            bloque.className =
                "pregunta";


            let texto =
                "Pregunta " +
                (indice + 1) +
                ": ";


            if(pregunta.tipo === "corriente"){

                texto +=
                    "¿Cuál es la corriente que pasa por ";

            }

            else if(pregunta.tipo === "voltaje"){

                texto +=
                    "¿Cuál es el voltaje de ";

            }

            else if(
                pregunta.tipo ===
                "resistencia_equivalente"
            ){

                texto +=
                    "¿Cuál es la resistencia equivalente?";

            }


            if(componente){

                if(componente.tipo === "resistencia"){

                    texto +=
                        "R" +
                        componente.id +
                        "?";
                }

                else if(componente.tipo === "led"){

                    texto +=
                        "el LED " +
                        componente.id +
                        "?";
                }
            }


            const titulo =
                document.createElement("p");

            titulo.textContent =
                texto;


            const input =
                document.createElement("input");


            input.type = "number";

            input.step = "any";

            input.placeholder =
                obtenerUnidad(
                    pregunta.tipo
                );


            input.id =
                "respuesta-" +
                indice;


            const boton =
                document.createElement("button");


            boton.textContent =
                "Comprobar";


            boton.onclick = () => {

                comprobarRespuesta(
                    indice,
                    input
                );
            };


            bloque.appendChild(titulo);

            bloque.appendChild(input);

            bloque.appendChild(boton);


            preguntas.appendChild(
                bloque
            );
        }
    );
}


// =====================================================
// BUSCAR COMPONENTE
// =====================================================

function buscarComponente(id){

    if(!ejercicio)
        return null;


    return ejercicio.componentes.find(
        componente =>
            componente.id === id
    );
}


// =====================================================
// UNIDAD
// =====================================================

function obtenerUnidad(tipo){

    if(tipo === "corriente")
        return "A";

    if(tipo === "voltaje")
        return "V";

    if(tipo === "resistencia_equivalente")
        return "Ω";

    return "";
}


// =====================================================
// COMPROBAR RESPUESTA
// =====================================================

async function comprobarRespuesta(
    numero,
    input
){

    const valor =
        Number(input.value);


    if(input.value === "" ||
       Number.isNaN(valor)){

        resultado.textContent =
            "Escribe una respuesta.";

        return;
    }


    try{

        const respuesta =
            await fetch(
                MOTOR + "/responder",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({

                        pregunta: numero,

                        respuesta: valor

                    })
                }
            );


        if(!respuesta.ok){

            throw new Error(
                "HTTP " +
                respuesta.status
            );
        }


        const datos =
            await respuesta.json();


        if(datos.correcto){

            input.classList.add(
                "correcto"
            );


            resultado.textContent =
                "✓ Correcto";

        }

        else{

            input.classList.add(
                "incorrecto"
            );


            resultado.textContent =
                "✗ Incorrecto";
        }

    }

    catch(error){

        console.error(error);

        resultado.textContent =
            "Error al comprobar.";
    }
}


// =====================================================
// CAMBIAR DIFICULTAD
// =====================================================

function cambiarDificultad(valor){

    const dificultad =
        Number(valor);


    if(
        dificultad < 1 ||
        dificultad > 3
    ){

        return;
    }


    generarEjercicio(
        dificultad
    );
}


// =====================================================
// INICIO
// =====================================================

document.addEventListener(
    "DOMContentLoaded",
    () => {

        /*
            Puedes quitar esto si no quieres
            generar automáticamente.
        */

        generarEjercicio(1);

    }
);