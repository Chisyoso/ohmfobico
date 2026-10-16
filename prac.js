
const MOTOR = "http://209.209.40.179:10058";

let ejercicio = null;
let dificultadActual = 1;
let comprobadas = new Set();

const circuito = document.getElementById("circuito");
const preguntas = document.getElementById("preguntas");
const resultado = document.getElementById("resultado");
const estado = document.getElementById("estado");
const dificultadTexto = document.getElementById("dificultad");

async function pedir(ruta, datos = null) {
    const opciones = {
        method: datos ? "POST" : "GET",
        headers: {}
    };

    if (datos) {
        opciones.headers["Content-Type"] = "application/json";
        opciones.body = JSON.stringify(datos);
    }

    const respuesta = await fetch(MOTOR + ruta, opciones);
    const texto = await respuesta.text();

    if (!respuesta.ok) {
        throw new Error("HTTP " + respuesta.status + ": " + texto);
    }

    try {
        return JSON.parse(texto);
    } catch {
        throw new Error("La API no devolvió JSON válido: " + texto.slice(0, 150));
    }
}

function mostrarEstado(texto) {
    if (estado) estado.textContent = texto;
}

function mostrarResultado(texto, clase = "") {
    resultado.textContent = texto;
    resultado.className = "resultado-practica";

    if (clase) resultado.classList.add(clase);
}

async function comprobarConexion() {
    mostrarEstado("Conectando...");

    try {
        const datos = await pedir("/");

        if (datos.ok) {
            mostrarEstado("Motor C++ conectado");
        } else {
            mostrarEstado("API respondió");
        }
    } catch (error) {
        mostrarEstado("Sin conexión");
        console.error("Error de conexión:", error);
    }
}

async function generarEjercicio(dificultad = 1) {
    dificultadActual = Number(dificultad);

    if (dificultadActual < 1 || dificultadActual > 3) {
        dificultadActual = 1;
    }

    actualizarNiveles();

    dificultadTexto.textContent =
        "Dificultad: " +
        ["", "Fácil", "Medio", "Difícil"][dificultadActual];

    circuito.replaceChildren();
    preguntas.replaceChildren();

    const cargando = document.createElement("p");
    cargando.textContent = "Generando circuito...";
    circuito.appendChild(cargando);

    mostrarResultado("");
    mostrarEstado("Generando...");

    try {
        ejercicio = await pedir("/generar", {
            dificultad: dificultadActual
        });

        if (!Array.isArray(ejercicio.componentes) ||
            !Array.isArray(ejercicio.preguntas)) {
            throw new Error("La API no envió los componentes o las preguntas.");
        }

        comprobadas.clear();

        dibujarCircuito();
        mostrarPreguntas();

        mostrarEstado("Motor C++ conectado");
        mostrarResultado("Ejercicio generado correctamente.");
    } catch (error) {
        ejercicio = null;

        circuito.replaceChildren();
        preguntas.replaceChildren();

        const mensaje = document.createElement("p");
        mensaje.textContent = "No se pudo generar el circuito.";
        circuito.appendChild(mensaje);

        mostrarEstado("Error de conexión");
        mostrarResultado(error.message);

        console.error("Error al generar:", error);
    }
}

function actualizarNiveles() {
    for (let i = 1; i <= 3; i++) {
        const boton = document.getElementById("nivel-" + i);

        if (boton) {
            boton.classList.toggle("activo", i === dificultadActual);
        }
    }
}

function cambiarDificultad(valor) {
    generarEjercicio(valor);
}

function dibujarCircuito() {
    circuito.replaceChildren();

    const contenedor = document.createElement("div");
    contenedor.className = "circuito";

    ejercicio.componentes.forEach((componente, indice) => {
        const elemento = document.createElement("div");
        elemento.className = "componente";

        const simbolo = document.createElement("div");
        simbolo.className = "simbolo-circuito";

        const nombre = document.createElement("strong");
        const dato = document.createElement("small");

        if (componente.tipo === "bateria") {
            simbolo.textContent = "＋";
            nombre.textContent = "Batería " + componente.id;
            dato.textContent = componente.v + " V";
        } else if (componente.tipo === "resistencia") {
            simbolo.textContent = "Ω";
            nombre.textContent = "R" + componente.id;
            dato.textContent = componente.r + " Ω";
        } else if (componente.tipo === "led") {
            simbolo.textContent = "LED";
            nombre.textContent = "LED " + componente.id;
            dato.textContent = componente.v + " V";
        } else {
            simbolo.textContent = "?";
            nombre.textContent = componente.tipo || "Componente";
            dato.textContent = "";
        }

        elemento.appendChild(simbolo);
        elemento.appendChild(nombre);
        elemento.appendChild(dato);

        contenedor.appendChild(elemento);

        if (indice < ejercicio.componentes.length - 1) {
            const linea = document.createElement("span");
            linea.className = "linea";
            linea.textContent = "────";
            contenedor.appendChild(linea);
        }
    });

    circuito.appendChild(contenedor);

    const nota = document.createElement("p");
    nota.textContent =
        "Representación de los componentes recibidos del motor C++.";
    nota.style.color = "#bfc7d5";
    nota.style.fontSize = "13px";
    nota.style.marginTop = "12px";

    circuito.appendChild(nota);
}

function mostrarPreguntas() {
    preguntas.replaceChildren();

    if (ejercicio.preguntas.length === 0) {
        const texto = document.createElement("p");
        texto.textContent = "El motor no generó preguntas.";
        preguntas.appendChild(texto);
        return;
    }

    const titulo = document.createElement("h2");
    titulo.textContent = "Resuelve el ejercicio";
    titulo.style.color = "#7dd3fc";
    titulo.style.marginTop = "25px";

    preguntas.appendChild(titulo);

    ejercicio.preguntas.forEach((pregunta, indice) => {
        const bloque = document.createElement("div");
        bloque.className = "pregunta";

        const componente = ejercicio.componentes.find(
            c => c.id === pregunta.id
        );

        const texto = document.createElement("p");

        if (pregunta.tipo === "corriente") {
            texto.textContent = componente
                ? "¿Qué corriente pasa por " +
                  (componente.tipo === "resistencia"
                    ? "R" + componente.id
                    : componente.tipo + " " + componente.id) +
                  "?"
                : "¿Cuál es la corriente eléctrica?";
        } else if (pregunta.tipo === "voltaje") {
            texto.textContent = componente
                ? "¿Qué voltaje tiene el componente " + componente.id + "?"
                : "¿Cuál es el voltaje?";
        } else if (pregunta.tipo === "resistencia_equivalente") {
            texto.textContent = "¿Cuál es la resistencia equivalente del circuito?";
        } else {
            texto.textContent = "Calcula: " + pregunta.tipo;
        }

        const formulario = document.createElement("div");
        formulario.className = "entrada-respuesta";

        const entrada = document.createElement("input");
        entrada.type = "number";
        entrada.step = "any";
        entrada.placeholder = "Escribe tu respuesta";
        entrada.setAttribute("aria-label", "Respuesta " + (indice + 1));

        const unidad = document.createElement("span");
        unidad.id = "unidad";
        unidad.textContent = obtenerUnidad(pregunta.tipo);

        formulario.appendChild(entrada);
        formulario.appendChild(unidad);

        const botones = document.createElement("div");
        botones.className = "botones-practica";

        const enviar = document.createElement("button");
        enviar.className = "btn-enviar";
        enviar.textContent = "Comprobar";

        const estadoPregunta = document.createElement("p");
        estadoPregunta.className = "estado-pregunta";

        enviar.onclick = async () => {
            if (comprobadas.has(indice)) {
                estadoPregunta.textContent = "Esta respuesta ya fue comprobada.";
                return;
            }

            if (entrada.value.trim() === "") {
                estadoPregunta.textContent = "Escribe una respuesta.";
                return;
            }

            const valor = Number(entrada.value);

            if (!Number.isFinite(valor)) {
                estadoPregunta.textContent = "Introduce un número válido.";
                return;
            }

            enviar.disabled = true;
            estadoPregunta.textContent = "Comprobando con C++...";

            try {
                const datos = await pedir("/responder", {
                    pregunta: indice,
                    respuesta: valor
                });

                if (typeof datos.correcto !== "boolean") {
                    throw new Error(
                        datos.error || "Respuesta inesperada del motor."
                    );
                }

                comprobadas.add(indice);

                if (datos.correcto) {
                    estadoPregunta.textContent = "✓ ¡Correcto!";
                    estadoPregunta.className = "resultado-practica correcto";
                    entrada.classList.add("correcto");
                } else {
                    estadoPregunta.textContent = "✗ Incorrecto. Inténtalo en el siguiente ejercicio.";
                    estadoPregunta.className = "resultado-practica incorrecto";
                    entrada.classList.add("incorrecto");
                }

                entrada.disabled = true;
            } catch (error) {
                estadoPregunta.textContent = "Error: " + error.message;
                enviar.disabled = false;
                console.error("Error al comprobar:", error);
            }
        };

        entrada.addEventListener("keydown", event => {
            if (event.key === "Enter") enviar.click();
        });

        botones.appendChild(enviar);

        bloque.appendChild(texto);
        bloque.appendChild(formulario);
        bloque.appendChild(botones);
        bloque.appendChild(estadoPregunta);

        preguntas.appendChild(bloque);
    });

    const siguiente = document.createElement("button");
    siguiente.className = "btn-siguiente";
    siguiente.textContent = "Generar otro circuito";
    siguiente.onclick = () => generarEjercicio(dificultadActual);

    preguntas.appendChild(siguiente);
}

function obtenerUnidad(tipo) {
    if (tipo === "corriente") return "A";
    if (tipo === "voltaje") return "V";
    if (tipo === "resistencia_equivalente") return "Ω";
    return "";
}

document.addEventListener("DOMContentLoaded", () => {
    comprobarConexion();
    generarEjercicio(1);
});
