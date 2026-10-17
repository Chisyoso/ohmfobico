let ejercicio = null;
let dificultadActual = 1;

const circuito = document.getElementById(“circuito”);
const preguntas = document.getElementById(“preguntas”);
const resultado = document.getElementById(“resultado”);
const estado = document.getElementById(“estado”);
const dificultadTexto = document.getElementById(“dificultad”);

function aleatorio(min, max) {
return Math.floor(Math.random() * (max - min + 1)) + min;
}

function redondear(numero) {
return Math.round(numero * 10000) / 10000;
}

function numeroDecimal(min, max, decimales = 1) {
const factor = Math.pow(10, decimales);
return Math.round((Math.random() * (max - min) + min) * factor) / factor;
}

function generarCircuito(dificultad) {
const bateria = {
id: “B1”,
tipo: “bateria”,
v: aleatorio(6, 12)
};

let resistencias;
if (dificultad === 1) {
    resistencias = [
        crearResistencia(1),
        crearResistencia(2)
    ];
} else if (dificultad === 2) {
    resistencias = [
        crearResistencia(1),
        crearResistencia(2),
        crearResistencia(3)
    ];
} else {
    resistencias = [
        crearResistencia(1),
        crearResistencia(2),
        crearResistencia(3),
        crearResistencia(4)
    ];
}
let tipo;
if (dificultad === 1) {
    tipo = Math.random() < 0.5 ? "serie" : "paralelo";
} else {
    const tipos = ["serie", "paralelo", "mixto"];
    tipo = tipos[aleatorio(0, tipos.length - 1)];
}
let led = null;
if (dificultad >= 2) {
    led = {
        id: "LED1",
        tipo: "led",
        v: numeroDecimal(1.8, 2.2, 1)
    };
}
if (tipo === "mixto" && resistencias.length < 3) {
    tipo = "serie";
}
return {
    bateria,
    resistencias,
    led,
    tipo
};

}

function crearResistencia(id) {
return {
id: “R” + id,
tipo: “resistencia”,
r: aleatorio(10, 100),
v: 0,
i: 0,
p: 0
};
}

function calcularSerie(circuito) {
const resistencias = circuito.resistencias;
const led = circuito.led;

let voltajeDisponible = circuito.bateria.v;
if (led) {
    voltajeDisponible -= led.v;
}
if (voltajeDisponible < 0) {
    voltajeDisponible = 0;
}
const resistenciaTotal = resistencias.reduce(
    (total, resistencia) => total + resistencia.r,
    0
);
const corrienteTotal =
    resistenciaTotal > 0
        ? voltajeDisponible / resistenciaTotal
        : 0;
for (const resistencia of resistencias) {
    resistencia.i = corrienteTotal;
    resistencia.v = corrienteTotal * resistencia.r;
    resistencia.p = resistencia.v * resistencia.i;
}
if (led) {
    led.i = corrienteTotal;
    led.p = led.v * led.i;
}
return {
    resistenciaTotal,
    corrienteTotal,
    voltajeTotal: circuito.bateria.v
};

}

function calcularParalelo(circuito) {
const resistencias = circuito.resistencias;
const voltaje = circuito.bateria.v;

const inversa = resistencias.reduce(
    (total, resistencia) => total + 1 / resistencia.r,
    0
);
const resistenciaTotal = 1 / inversa;
let corrienteTotal = 0;
for (const resistencia of resistencias) {
    resistencia.v = voltaje;
    resistencia.i = voltaje / resistencia.r;
    resistencia.p = resistencia.v * resistencia.i;
    corrienteTotal += resistencia.i;
}
return {
    resistenciaTotal,
    corrienteTotal,
    voltajeTotal: voltaje
};

}

function calcularMixto(circuito) {
const r = circuito.resistencias;
const bateria = circuito.bateria.v;

const paralelo =
    1 / ((1 / r[1].r) + (1 / r[2].r));
const resistenciaTotal = r[0].r + paralelo;
const corrienteTotal =
    bateria / resistenciaTotal;
const voltajeR1 =
    corrienteTotal * r[0].r;
const voltajeParalelo =
    bateria - voltajeR1;
const corrienteR2 =
    voltajeParalelo / r[1].r;
const corrienteR3 =
    voltajeParalelo / r[2].r;
r[0].v = voltajeR1;
r[0].i = corrienteTotal;
r[0].p = r[0].v * r[0].i;
r[1].v = voltajeParalelo;
r[1].i = corrienteR2;
r[1].p = r[1].v * r[1].i;
r[2].v = voltajeParalelo;
r[2].i = corrienteR3;
r[2].p = r[2].v * r[2].i;
if (circuito.led) {
    circuito.led.i = corrienteTotal;
    circuito.led.p =
        circuito.led.v * circuito.led.i;
}
return {
    resistenciaTotal,
    corrienteTotal,
    voltajeTotal: bateria
};

}

function calcularCircuito(circuito) {
if (circuito.tipo === “serie”) {
return calcularSerie(circuito);
}

if (circuito.tipo === "paralelo") {
    return calcularParalelo(circuito);
}
return calcularMixto(circuito);

}

function crearPreguntas(circuito, resultados, dificultad) {
const disponibles = [];

for (const resistencia of circuito.resistencias) {
    disponibles.push({
        tipo: "corriente",
        componente: resistencia,
        respuesta: resistencia.i,
        unidad: "A",
        texto:
            "¿Cuál es la corriente que pasa por " +
            resistencia.id + "?"
    });
    disponibles.push({
        tipo: "voltaje",
        componente: resistencia,
        respuesta: resistencia.v,
        unidad: "V",
        texto:
            "¿Cuál es el voltaje en " +
            resistencia.id + "?"
    });
    disponibles.push({
        tipo: "resistencia",
        componente: resistencia,
        respuesta: resistencia.r,
        unidad: "Ω",
        texto:
            "¿Cuál es la resistencia de " +
            resistencia.id + "?"
    });
    disponibles.push({
        tipo: "potencia",
        componente: resistencia,
        respuesta: resistencia.p,
        unidad: "W",
        texto:
            "¿Cuál es la potencia disipada por " +
            resistencia.id + "?"
    });
}
if (circuito.led) {
    disponibles.push({
        tipo: "voltaje",
        componente: circuito.led,
        respuesta: circuito.led.v,
        unidad: "V",
        texto:
            "¿Cuál es el voltaje del LED?"
    });
    disponibles.push({
        tipo: "corriente",
        componente: circuito.led,
        respuesta: circuito.led.i,
        unidad: "A",
        texto:
            "¿Cuál es la corriente que pasa por el LED?"
    });
    disponibles.push({
        tipo: "potencia",
        componente: circuito.led,
        respuesta: circuito.led.p,
        unidad: "W",
        texto:
            "¿Cuál es la potencia del LED?"
    });
}
disponibles.push({
    tipo: "resistencia_total",
    componente: null,
    respuesta: resultados.resistenciaTotal,
    unidad: "Ω",
    texto:
        "¿Cuál es la resistencia equivalente del circuito?"
});
disponibles.push({
    tipo: "corriente_total",
    componente: null,
    respuesta: resultados.corrienteTotal,
    unidad: "A",
    texto:
        "¿Cuál es la corriente total del circuito?"
});
disponibles.push({
    tipo: "potencia_total",
    componente: null,
    respuesta:
        circuito.bateria.v * resultados.corrienteTotal,
    unidad: "W",
    texto:
        "¿Cuál es la potencia total suministrada por la batería?"
});
if (dificultad === 1) {
    return mezclar(disponibles).slice(0, 2);
}
if (dificultad === 2) {
    return mezclar(disponibles).slice(0, 4);
}
return mezclar(disponibles).slice(0, 6);

}

function mezclar(array) {
const copia = […array];

for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
}
return copia;

}

function generarEjercicio(dificultad = 1) {
dificultadActual = Number(dificultad);

if (![1, 2, 3].includes(dificultadActual)) {
    dificultadActual = 1;
}
actualizarNiveles();
const nombres = ["", "Fácil", "Medio", "Difícil"];
dificultadTexto.textContent =
    "Dificultad: " + nombres[dificultadActual];
mostrarEstado("Generando circuito...");
const circuitoGenerado =
    generarCircuito(dificultadActual);
const resultados =
    calcularCircuito(circuitoGenerado);
const preguntasGeneradas =
    crearPreguntas(
        circuitoGenerado,
        resultados,
        dificultadActual
    );
ejercicio = {
    circuito: circuitoGenerado,
    resultados,
    preguntas: preguntasGeneradas
};
dibujarCircuito();
mostrarPreguntas();
mostrarEstado("Motor JavaScript activo");
mostrarResultado("Ejercicio generado correctamente.");

}

function cambiarDificultad(valor) {
generarEjercicio(valor);
}

function actualizarNiveles() {
for (let i = 1; i <= 3; i++) {
const boton =
document.getElementById(“nivel-” + i);

    if (boton) {
        boton.classList.toggle(
            "activo",
            i === dificultadActual
        );
    }
}

}

function crearSVG() {
return `
        <rect
            x="10"
            y="10"
            width="880"
            height="410"
            rx="20"
            fill="#101820"
            stroke="#263b55"
            stroke-width="2"
        />
        <g id="circuito-svg"></g>
    </svg>
`;

}

function dibujarCircuito() {
circuito.innerHTML =
crearSVG();

const svg =
    circuito.querySelector("#circuito-svg");
const tipo =
    ejercicio.circuito.tipo;
if (tipo === "serie") {
    dibujarSerie(svg);
} else if (tipo === "paralelo") {
    dibujarParalelo(svg);
} else {
    dibujarMixto(svg);
}

}

function linea(x1, y1, x2, y2) {
return <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#cbd5e1" stroke-width="4" stroke-linecap="round" />;
}

function texto(x, y, contenido, grande = false) {
return <text x="${x}" y="${y}" fill="#e2e8f0" font-size="${grande ? 22 : 17}" text-anchor="middle" font-family="Arial, sans-serif" > ${contenido} </text>;
}

function dibujarBateria(x, y, vertical = false) {
if (vertical) {
return <g> <line x1="${x}" y1="${y - 35}" x2="${x}" y2="${y - 12}" stroke="#cbd5e1" stroke-width="4" /> <line x1="${x - 25}" y1="${y - 12}" x2="${x + 25}" y2="${y - 12}" stroke="#7dd3fc" stroke-width="6" /> <line x1="${x - 15}" y1="${y + 5}" x2="${x + 15}" y2="${y + 5}" stroke="#7dd3fc" stroke-width="4" /> <line x1="${x}" y1="${y + 5}" x2="${x}" y2="${y + 35}" stroke="#cbd5e1" stroke-width="4" /> ${texto( x + 70, y, ejercicio.circuito.bateria.v + " V", true )} </g>;
}

return `
    <g>
        <line
            x1="${x - 35}"
            y1="${y}"
            x2="${x - 12}"
            y2="${y}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        <line
            x1="${x - 12}"
            y1="${y - 25}"
            x2="${x - 12}"
            y2="${y + 25}"
            stroke="#7dd3fc"
            stroke-width="6"
        />
        <line
            x1="${x + 5}"
            y1="${y - 15}"
            x2="${x + 5}"
            y2="${y + 15}"
            stroke="#7dd3fc"
            stroke-width="4"
        />
        <line
            x1="${x + 5}"
            y1="${y}"
            x2="${x + 35}"
            y2="${y}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        ${texto(
            x,
            y + 55,
            ejercicio.circuito.bateria.v + " V",
            true
        )}
    </g>
`;

}

function dibujarResistencia(x, y, vertical = false, resistencia = null) {
const valor =
resistencia || ejercicio.circuito.resistencias[0];

if (!vertical) {
    return `
        <g>
            <line
                x1="${x - 65}"
                y1="${y}"
                x2="${x - 35}"
                y2="${y}"
                stroke="#cbd5e1"
                stroke-width="4"
            />
            <polyline
                points="
                ${x - 35},${y}
                ${x - 25},${y - 18}
                ${x - 10},${y + 18}
                ${x + 5},${y - 18}
                ${x + 20},${y + 18}
                ${x + 35},${y}
                "
                fill="none"
                stroke="#f8fafc"
                stroke-width="5"
            />
            <line
                x1="${x + 35}"
                y1="${y}"
                x2="${x + 65}"
                y2="${y}"
                stroke="#cbd5e1"
                stroke-width="4"
            />
            ${texto(
                x,
                y - 32,
                valor.id + " = " + valor.r + " Ω",
                true
            )}
        </g>
    `;
}
return `
    <g>
        <line
            x1="${x}"
            y1="${y - 65}"
            x2="${x}"
            y2="${y - 35}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        <polyline
            points="
            ${x},${y - 35}
            ${x - 18},${y - 25}
            ${x + 18},${y - 10}
            ${x - 18},${y + 5}
            ${x + 18},${y + 20}
            ${x},${y + 35}
            "
            fill="none"
            stroke="#f8fafc"
            stroke-width="5"
        />
        <line
            x1="${x}"
            y1="${y + 35}"
            x2="${x}"
            y2="${y + 65}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        ${texto(
            x + 90,
            y,
            valor.id + " = " + valor.r + " Ω",
            true
        )}
    </g>
`;

}

function dibujarLED(x, y, vertical = false) {
const led = ejercicio.circuito.led;

if (!led) {
    return "";
}
if (!vertical) {
    return `
        <g>
            <line
                x1="${x - 65}"
                y1="${y}"
                x2="${x - 28}"
                y2="${y}"
                stroke="#cbd5e1"
                stroke-width="4"
            />
            <polygon
                points="
                ${x - 28},${y - 25}
                ${x + 18},${y}
                ${x - 28},${y + 25}
                "
                fill="#172a3d"
                stroke="#f8fafc"
                stroke-width="4"
            />
            <line
                x1="${x + 18}"
                y1="${y - 25}"
                x2="${x + 18}"
                y2="${y + 25}"
                stroke="#7dd3fc"
                stroke-width="5"
            />
            <line
                x1="${x - 5}"
                y1="${y - 40}"
                x2="${x + 15}"
                y2="${y - 65}"
                stroke="#7dd3fc"
                stroke-width="3"
                marker-end="url(#flecha)"
            />
            <line
                x1="${x + 8}"
                y1="${y - 35}"
                x2="${x + 28}"
                y2="${y - 60}"
                stroke="#7dd3fc"
                stroke-width="3"
                marker-end="url(#flecha)"
            />
            <line
                x1="${x + 18}"
                y1="${y}"
                x2="${x + 65}"
                y2="${y}"
                stroke="#cbd5e1"
                stroke-width="4"
            />
            ${texto(
                x,
                y + 58,
                "LED = " + led.v + " V",
                true
            )}
        </g>
    `;
}
return `
    <g>
        <line
            x1="${x}"
            y1="${y - 65}"
            x2="${x}"
            y2="${y - 28}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        <polygon
            points="
            ${x - 25},${y - 28}
            ${x},${y + 18}
            ${x + 25},${y - 28}
            "
            fill="#172a3d"
            stroke="#f8fafc"
            stroke-width="4"
        />
        <line
            x1="${x - 25}"
            y1="${y + 18}"
            x2="${x + 25}"
            y2="${y + 18}"
            stroke="#7dd3fc"
            stroke-width="5"
        />
        <line
            x1="${x + 35}"
            y1="${y - 5}"
            x2="${x + 65}"
            y2="${y - 30}"
            stroke="#7dd3fc"
            stroke-width="3"
            marker-end="url(#flecha)"
        />
        <line
            x1="${x + 45}"
            y1="${y + 10}"
            x2="${x + 75}"
            y2="${y - 15}"
            stroke="#7dd3fc"
            stroke-width="3"
            marker-end="url(#flecha)"
        />
        <line
            x1="${x}"
            y1="${y + 18}"
            x2="${x}"
            y2="${y + 65}"
            stroke="#cbd5e1"
            stroke-width="4"
        />
        ${texto(
            x + 100,
            y,
            "LED = " + led.v + " V",
            true
        )}
    </g>
`;

}

function dibujarSerie(svg) {
const y = 215;

let contenido = "";
contenido += dibujarBateria(100, y);
contenido += linea(135, y, 190, y);
let x = 255;
for (const resistencia of ejercicio.circuito.resistencias) {
    contenido +=
        dibujarResistencia(
            x,
            y,
            false,
            resistencia
        );
    contenido +=
        linea(
            x + 65,
            y,
            x + 105,
            y
        );
    x += 150;
}
if (ejercicio.circuito.led) {
    contenido +=
        dibujarLED(
            x,
            y
        );
    contenido +=
        linea(
            x + 65,
            y,
            800,
            y
        );
} else {
    contenido +=
        linea(
            x,
            y,
            800,
            y
        );
}
contenido += linea(800, y, 800, 340);
contenido += linea(800, 340, 100, 340);
contenido += linea(100, 340, 100, y);
contenido += texto(
    450,
    390,
    "Circuito en serie",
    true
);
svg.innerHTML = contenido;

}

function dibujarParalelo(svg) {
const resistencias =
ejercicio.circuito.resistencias;

const centro = 450;
const inicio = 190;
const fin = 710;
let contenido = "";
contenido +=
    dibujarBateria(
        100,
        215
    );
contenido +=
    linea(
        135,
        215,
        inicio,
        215
    );
contenido +=
    linea(
        inicio,
        215,
        inicio,
        110
    );
contenido +=
    linea(
        inicio,
        215,
        inicio,
        320
    );
contenido +=
    linea(
        fin,
        110,
        fin,
        320
    );
contenido +=
    linea(
        fin,
        215,
        800,
        215
    );
const posiciones =
    [130, 215, 300];
resistencias.forEach((resistencia, indice) => {
    const yy =
        posiciones[indice] || 215;
    contenido +=
        linea(
            inicio,
            yy,
            300,
            yy
        );
    contenido +=
        dibujarResistencia(
            365,
            yy,
            false,
            resistencia
        );
    contenido +=
        linea(
            430,
            yy,
            fin,
            yy
        );
});
contenido +=
    linea(
        800,
        215,
        800,
        350
    );
contenido +=
    linea(
        800,
        350,
        100,
        350
    );
contenido +=
    linea(
        100,
        350,
        100,
        215
    );
contenido += texto(
    450,
    390,
    "Circuito en paralelo",
    true
);
svg.innerHTML = contenido;

}

function dibujarMixto(svg) {
const r =
ejercicio.circuito.resistencias;

let contenido = "";
contenido +=
    dibujarBateria(
        100,
        215
    );
contenido +=
    linea(
        135,
        215,
        190,
        215
    );
contenido +=
    dibujarResistencia(
        250,
        215,
        false,
        r[0]
    );
contenido +=
    linea(
        315,
        215,
        370,
        215
    );
contenido +=
    linea(
        370,
        215,
        370,
        130
    );
contenido +=
    linea(
        370,
        215,
        370,
        300
    );
contenido +=
    linea(
        370,
        130,
        445,
        130
    );
contenido +=
    dibujarResistencia(
        510,
        130,
        false,
        r[1]
    );
contenido +=
    linea(
        575,
        130,
        650,
        130
    );
contenido +=
    linea(
        650,
        130,
        650,
        300
    );
contenido +=
    linea(
        370,
        300,
        445,
        300
    );
contenido +=
    dibujarResistencia(
        510,
        300,
        false,
        r[2]
    );
contenido +=
    linea(
        575,
        300,
        650,
        300
    );
contenido +=
    linea(
        650,
        215,
        800,
        215
    );
contenido +=
    linea(
        800,
        215,
        800,
        350
    );
contenido +=
    linea(
        800,
        350,
        100,
        350
    );
contenido +=
    linea(
        100,
        350,
        100,
        215
    );
contenido += texto(
    510,
    75,
    "R1 en serie con R2 || R3",
    true
);
svg.innerHTML = contenido;

}

function mostrarPreguntas() {
preguntas.replaceChildren();

const titulo =
    document.createElement("h2");
titulo.textContent =
    "Resuelve el ejercicio";
titulo.style.color =
    "#7dd3fc";
preguntas.appendChild(titulo);
ejercicio.preguntas.forEach(
    (pregunta, indice) => {
        const bloque =
            document.createElement("div");
        bloque.className =
            "pregunta";
        const textoPregunta =
            document.createElement("p");
        textoPregunta.textContent =
            pregunta.texto;
        const entrada =
            document.createElement("input");
        entrada.type = "number";
        entrada.step = "any";
        entrada.placeholder = "Respuesta";
        const unidad =
            document.createElement("span");
        unidad.textContent =
            pregunta.unidad;
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
                    evento.key === "Enter"
                ) {
                    comprobar.click();
                }
            }
        );
        botones.appendChild(
            comprobar
        );
        bloque.appendChild(
            textoPregunta
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

function comprobarRespuesta(
numero,
entrada,
mensaje,
boton
) {
if (
entrada.value.trim() === “”
) {
mensaje.textContent =
“Escribe una respuesta.”;

    mensaje.className =
        "resultado-practica incorrecto";
    return;
}
const valor =
    Number(entrada.value);
if (!Number.isFinite(valor)) {
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
    diferencia <= tolerancia
) {
    mensaje.textContent =
        "✓ ¡Correcto!";
    mensaje.className =
        "resultado-practica correcto";
    entrada.classList.add(
        "correcto"
    );
    entrada.disabled = true;
    boton.disabled = true;
} else {
    mensaje.textContent =
        "✗ Incorrecto. Inténtalo nuevamente.";
    mensaje.className =
        "resultado-practica incorrecto";
}

}

function mostrarResultado(
texto,
clase = “”
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

document.addEventListener(
“DOMContentLoaded”,
function () {
generarEjercicio(1);
}
);