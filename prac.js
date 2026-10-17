let ejercicio = null;
let dificultadActual = 1;

const circuito = document.getElementById("circuito");
const preguntas = document.getElementById("preguntas");
const resultado = document.getElementById("resultado");
const estado = document.getElementById("estado");
const dificultadTexto = document.getElementById("dificultad");


// ============================================================
// UTILIDADES
// ============================================================

function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function redondear(numero) {
    return Math.round(numero * 10000) / 10000;
}

function numeroAleatorioDecimal(min, max) {
    return Math.random() * (max - min) + min;
}


// ============================================================
// GENERADOR DE COMPONENTES
// ============================================================

function generarComponentes(dificultad) {

    const componentes = [];

    // Batería principal
    const bateria = aleatorio(6, 12);

    componentes.push({
        id: 0,
        tipo: "bateria",
        v: bateria,
        r: 0,
        nodoA: 0,
        nodoB: 1
    });


    // Cantidad de resistencias
    let cantidadResistencias;

    if (dificultad === 1) {
        cantidadResistencias = 2;
    }
    else if (dificultad === 2) {
        cantidadResistencias = 3;
    }
    else {
        cantidadResistencias = 4;
    }


    for (let i = 1; i <= cantidadResistencias; i++) {

        componentes.push({
            id: i,
            tipo: "resistencia",
            v: 0,
            r: aleatorio(10, 100),
            nodoA: i,
            nodoB: i + 1
        });
    }


    // LEDs a partir de dificultad 2
    if (dificultad >= 2) {

        componentes.push({
            id: componentes.length,
            tipo: "led",
            v: 1.8,
            r: 0,
            nodoA: componentes.length,
            nodoB: componentes.length + 1
        });
    }


    // Segunda batería en difícil
    if (dificultad >= 3) {

        componentes.push({
            id: componentes.length,
            tipo: "bateria",
            v: aleatorio(3, 9),
            r: 0,
            nodoA: componentes.length,
            nodoB: componentes.length + 1
        });
    }

    return componentes;
}


// ============================================================
// RESISTENCIAS
// ============================================================

function obtenerResistencias(componentes) {

    return componentes.filter(
        componente => componente.tipo === "resistencia"
    );
}


function resistenciaSerie(resistencias) {

    let total = 0;

    for (const resistencia of resistencias) {
        total += resistencia.r;
    }

    return total;
}


function resistenciaParalelo(resistencias) {

    let total = 0;

    for (const resistencia of resistencias) {
        total += 1 / resistencia.r;
    }

    return 1 / total;
}


// ============================================================
// TIPO DE CIRCUITO
// ============================================================

function obtenerTipoCircuito(dificultad) {

    if (dificultad === 1) {

        if (Math.random() < 0.5) {
            return "serie";
        }

        return "paralelo";
    }


    if (dificultad === 2) {

        const tipos = [
            "serie",
            "paralelo",
            "mixto"
        ];

        return tipos[aleatorio(0, tipos.length - 1)];
    }


    const tipos = [
        "serie",
        "paralelo",
        "mixto"
    ];

    return tipos[aleatorio(0, tipos.length - 1)];
}


// ============================================================
// CALCULAR CIRCUITO
// ============================================================

function calcularCircuito(componentes, tipo, dificultad) {

    const preguntas = [];

    const bateria = componentes.find(
        componente => componente.tipo === "bateria"
    );

    const resistencias = obtenerResistencias(componentes);

    let voltaje = bateria.v;


    // --------------------------------------------------------
    // LED
    // --------------------------------------------------------

    const leds = componentes.filter(
        componente => componente.tipo === "led"
    );

    for (const led of leds) {
        voltaje -= led.v;
    }

    if (voltaje < 0) {
        voltaje = 0;
    }


    // --------------------------------------------------------
    // SERIE
    // --------------------------------------------------------

    if (tipo === "serie") {

        const resistenciaTotal =
            resistenciaSerie(resistencias);

        const corriente =
            voltaje / resistenciaTotal;


        for (const resistencia of resistencias) {

            const voltajeResistencia =
                corriente * resistencia.r;

            resistencia.v =
                redondear(voltajeResistencia);
        }


        // Pregunta de corriente
        const resistenciaPregunta =
            resistencias[aleatorio(0, resistencias.length - 1)];

        preguntas.push({
            id: resistenciaPregunta.id,
            tipo: "corriente",
            respuesta: redondear(corriente)
        });


        // Pregunta de voltaje
        if (dificultad >= 2) {

            const resistenciaVoltaje =
                resistencias[aleatorio(0, resistencias.length - 1)];

            preguntas.push({
                id: resistenciaVoltaje.id,
                tipo: "voltaje",
                respuesta: redondear(resistenciaVoltaje.v)
            });
        }


        // Resistencia equivalente
        if (dificultad >= 3) {

            preguntas.push({
                id: 0,
                tipo: "resistencia_equivalente",
                respuesta: redondear(resistenciaTotal)
            });
        }
    }


    // --------------------------------------------------------
    // PARALELO
    // --------------------------------------------------------

    else if (tipo === "paralelo") {

        const resistenciaTotal =
            resistenciaParalelo(resistencias);


        for (const resistencia of resistencias) {

            resistencia.v =
                redondear(voltaje);
        }


        const resistenciaPregunta =
            resistencias[aleatorio(0, resistencias.length - 1)];


        const corriente =
            voltaje / resistenciaPregunta.r;


        preguntas.push({
            id: resistenciaPregunta.id,
            tipo: "corriente",
            respuesta: redondear(corriente)
        });


        if (dificultad >= 2) {

            const otra =
                resistencias[aleatorio(0, resistencias.length - 1)];

            preguntas.push({
                id: otra.id,
                tipo: "voltaje",
                respuesta: redondear(voltaje)
            });
        }


        if (dificultad >= 3) {

            preguntas.push({
                id: 0,
                tipo: "resistencia_equivalente",
                respuesta: redondear(resistenciaTotal)
            });
        }
    }


    // --------------------------------------------------------
    // MIXTO
    // --------------------------------------------------------

    else {

        /*
            R1 está en serie con:

                    R2
                    ||
                    R3

            Es decir:

            batería -- R1 --+-- R2 --+
                           |         |
                           +-- R3 --+
        */

        const r1 = resistencias[0];
        const r2 = resistencias[1];
        const r3 = resistencias[2];


        const paralelo =
            1 / ((1 / r2.r) + (1 / r3.r));


        const equivalente =
            r1.r + paralelo;


        const corrienteTotal =
            voltaje / equivalente;


        const voltajeR1 =
            corrienteTotal * r1.r;


        const voltajeParalelo =
            voltaje - voltajeR1;


        const corrienteR2 =
            voltajeParalelo / r2.r;


        const corrienteR3 =
            voltajeParalelo / r3.r;


        r1.v = redondear(voltajeR1);
        r2.v = redondear(voltajeParalelo);
        r3.v = redondear(voltajeParalelo);


        preguntas.push({
            id: r1.id,
            tipo: "corriente",
            respuesta: redondear(corrienteTotal)
        });


        preguntas.push({
            id: r2.id,
            tipo: "corriente",
            respuesta: redondear(corrienteR2)
        });


        if (dificultad >= 2) {

            preguntas.push({
                id: r3.id,
                tipo: "voltaje",
                respuesta: redondear(voltajeParalelo)
            });
        }


        if (dificultad >= 3) {

            preguntas.push({
                id: 0,
                tipo: "resistencia_equivalente",
                respuesta: redondear(equivalente)
            });
        }
    }


    return preguntas;
}


// ============================================================
// GENERAR EJERCICIO
// ============================================================

function generarEjercicio(dificultad = 1) {

    dificultadActual = Number(dificultad);

    if (
        dificultadActual < 1 ||
        dificultadActual > 3
    ) {
        dificultadActual = 1;
    }


    actualizarNiveles();


    const nombres = [
        "",
        "Fácil",
        "Medio",
        "Difícil"
    ];


    dificultadTexto.textContent =
        "Dificultad: " +
        nombres[dificultadActual];


    mostrarEstado("Generando circuito...");


    const componentes =
        generarComponentes(dificultadActual);


    const tipo =
        obtenerTipoCircuito(dificultadActual);


    const preguntasGeneradas =
        calcularCircuito(
            componentes,
            tipo,
            dificultadActual
        );


    ejercicio = {

        dificultad: dificultadActual,

        tipo: tipo,

        componentes: componentes,

        preguntas: preguntasGeneradas
    };


    dibujarCircuito();

    mostrarPreguntas();

    mostrarEstado("Motor JavaScript activo");

    mostrarResultado(
        "Ejercicio generado correctamente."
    );
}


// ============================================================
// NIVELES
// ============================================================

function cambiarDificultad(valor) {

    generarEjercicio(valor);
}


function actualizarNiveles() {

    for (let i = 1; i <= 3; i++) {

        const boton =
            document.getElementById("nivel-" + i);


        if (boton) {

            boton.classList.toggle(
                "activo",
                i === dificultadActual
            );
        }
    }
}


// ============================================================
// DIBUJAR CIRCUITO
// ============================================================

function dibujarCircuito() {

    circuito.replaceChildren();


    const titulo =
        document.createElement("h2");

    titulo.textContent =
        "Circuito " +
        ejercicio.tipo;

    titulo.style.color =
        "#7dd3fc";

    circuito.appendChild(titulo);


    const contenedor =
        document.createElement("div");

    contenedor.className =
        "circuito";


    ejercicio.componentes.forEach(
        (componente, indice) => {

            const elemento =
                document.createElement("div");

            elemento.className =
                "componente";


            const simbolo =
                document.createElement("div");

            simbolo.className =
                "simbolo-circuito";


            const nombre =
                document.createElement("strong");


            const dato =
                document.createElement("small");


            if (
                componente.tipo ===
                "bateria"
            ) {

                simbolo.textContent =
                    "＋";

                nombre.textContent =
                    "Batería " +
                    componente.id;

                dato.textContent =
                    componente.v +
                    " V";
            }


            else if (
                componente.tipo ===
                "resistencia"
            ) {

                simbolo.textContent =
                    "Ω";

                nombre.textContent =
                    "R" +
                    componente.id;

                dato.textContent =
                    componente.r +
                    " Ω";
            }


            else if (
                componente.tipo ===
                "led"
            ) {

                simbolo.textContent =
                    "LED";

                nombre.textContent =
                    "LED " +
                    componente.id;

                dato.textContent =
                    componente.v +
                    " V";
            }


            elemento.appendChild(
                simbolo
            );

            elemento.appendChild(
                nombre
            );

            elemento.appendChild(
                dato
            );


            contenedor.appendChild(
                elemento
            );


            if (
                indice <
                ejercicio.componentes.length - 1
            ) {

                const linea =
                    document.createElement("span");

                linea.className =
                    "linea";

                linea.textContent =
                    "────";

                contenedor.appendChild(
                    linea
                );
            }
        }
    );


    circuito.appendChild(
        contenedor
    );
}


// ============================================================
// PREGUNTAS
// ============================================================

function mostrarPreguntas() {

    preguntas.replaceChildren();


    const titulo =
        document.createElement("h2");

    titulo.textContent =
        "Resuelve el ejercicio";

    titulo.style.color =
        "#7dd3fc";

    preguntas.appendChild(
        titulo
    );


    ejercicio.preguntas.forEach(
        (pregunta, indice) => {

            const bloque =
                document.createElement("div");

            bloque.className =
                "pregunta";


            const componente =
                ejercicio.componentes.find(
                    componente =>
                        componente.id ===
                        pregunta.id
                );


            const texto =
                document.createElement("p");


            if (
                pregunta.tipo ===
                "corriente"
            ) {

                texto.textContent =
                    "¿Cuál es la corriente que pasa por " +
                    nombreComponente(componente) +
                    "?";
            }


            else if (
                pregunta.tipo ===
                "voltaje"
            ) {

                texto.textContent =
                    "¿Cuál es el voltaje de " +
                    nombreComponente(componente) +
                    "?";
            }


            else if (
                pregunta.tipo ===
                "resistencia_equivalente"
            ) {

                texto.textContent =
                    "¿Cuál es la resistencia equivalente del circuito?";
            }


            const entrada =
                document.createElement("input");

            entrada.type =
                "number";

            entrada.step =
                "any";

            entrada.placeholder =
                "Respuesta";


            const unidad =
                document.createElement("span");

            unidad.id =
                "unidad";

            unidad.textContent =
                obtenerUnidad(
                    pregunta.tipo
                );


            const entradaRespuesta =
                document.createElement("div");

            entradaRespuesta.className =
                "entrada-respuesta";


            entradaRespuesta.appendChild(
                entrada
            );

            entradaRespuesta.appendChild(
                unidad
            );


            const botones =
                document.createElement("div");

            botones.className =
                "botones-practica";


            const comprobar =
                document.createElement("button");

            comprobar.className =
                "btn-enviar";

            comprobar.textContent =
                "Comprobar";


            const mensaje =
                document.createElement("div");

            mensaje.className =
                "resultado-practica";


            comprobar.onclick =
                function () {

                    comprobarRespuesta(
                        indice,
                        entrada,
                        mensaje,
                        comprobar
                    );
                };


            entrada.addEventListener(
                "keydown",
                function (evento) {

                    if (
                        evento.key ===
                        "Enter"
                    ) {

                        comprobar.click();
                    }
                }
            );


            botones.appendChild(
                comprobar
            );


            bloque.appendChild(
                texto
            );

            bloque.appendChild(
                entradaRespuesta
            );

            bloque.appendChild(
                botones
            );

            bloque.appendChild(
                mensaje
            );


            preguntas.appendChild(
                bloque
            );
        }
    );


    const siguiente =
        document.createElement("button");

    siguiente.className =
        "btn-siguiente";

    siguiente.textContent =
        "Generar otro circuito";


    siguiente.onclick =
        function () {

            generarEjercicio(
                dificultadActual
            );
        };


    preguntas.appendChild(
        siguiente
    );
}


// ============================================================
// COMPROBAR RESPUESTA
// ============================================================

function comprobarRespuesta(
    numero,
    entrada,
    mensaje,
    boton
) {

    if (
        entrada.value.trim() === ""
    ) {

        mensaje.textContent =
            "Escribe una respuesta.";

        mensaje.className =
            "resultado-practica incorrecto";

        return;
    }


    const valor =
        Number(entrada.value);


    if (
        !Number.isFinite(valor)
    ) {

        mensaje.textContent =
            "Introduce un número válido.";

        mensaje.className =
            "resultado-practica incorrecto";

        return;
    }


    const correcta =
        ejercicio.preguntas[
            numero
        ].respuesta;


    const tolerancia =
        Math.max(
            0.000001,
            Math.abs(correcta) * 0.01
        );


    const diferencia =
        Math.abs(
            valor - correcta
        );


    if (
        diferencia <=
        tolerancia
    ) {

        mensaje.textContent =
            "✓ ¡Correcto!";

        mensaje.className =
            "resultado-practica correcto";

        entrada.classList.add(
            "correcto"
        );

        entrada.disabled =
            true;

        boton.disabled =
            true;
    }


    else {

        mensaje.textContent =
            "✗ Incorrecto. Inténtalo nuevamente.";

        mensaje.className =
            "resultado-practica incorrecto";
    }
}


// ============================================================
// NOMBRES
// ============================================================

function nombreComponente(componente) {

    if (!componente) {
        return "el circuito";
    }


    if (
        componente.tipo ===
        "resistencia"
    ) {

        return "R" +
            componente.id;
    }


    if (
        componente.tipo ===
        "led"
    ) {

        return "el LED " +
            componente.id;
    }


    if (
        componente.tipo ===
        "bateria"
    ) {

        return "la batería " +
            componente.id;
    }


    return "el componente " +
        componente.id;
}


// ============================================================
// UNIDADES
// ============================================================

function obtenerUnidad(tipo) {

    if (
        tipo ===
        "corriente"
    ) {
        return "A";
    }


    if (
        tipo ===
        "voltaje"
    ) {
        return "V";
    }


    if (
        tipo ===
        "resistencia_equivalente"
    ) {
        return "Ω";
    }


    return "";
}


// ============================================================
// RESULTADOS
// ============================================================

function mostrarResultado(
    texto,
    clase = ""
) {

    resultado.textContent =
        texto;

    resultado.className =
        "resultado-practica";


    if (clase) {

        resultado.classList.add(
            clase
        );
    }
}


function mostrarEstado(texto) {

    if (estado) {

        estado.textContent =
            texto;
    }
}


// ============================================================
// INICIO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        generarEjercicio(1);

    }
);