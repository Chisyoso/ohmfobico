"use strict";

/* =====================================================================
   OHMFÓBICO · Laboratorio de Ohm
   Generador de circuitos (serie, paralelo y mixto) resueltos solo con
   la Ley de Ohm (V = I × R) y la potencia (P = V × I).
   ===================================================================== */

/* ---------- Configuración ---------- */

const NOMBRES_NIVEL = ["", "Fácil", "Medio", "Difícil"];
const TOLERANCIA_RELATIVA = 0.02;

const CONFIG = {
    1: {
        baterias: [6, 9, 12],
        resistencias: [10, 20, 30, 40, 50, 60, 100],
        preguntasExtra: 1
    },
    2: {
        baterias: [5, 6, 9, 12, 15],
        resistencias: [10, 15, 22, 33, 47, 68, 100, 150],
        preguntasExtra: 3
    },
    3: {
        baterias: [9, 12, 15, 18, 24],
        resistencias: [10, 15, 22, 33, 47, 68, 100, 150, 220, 330],
        preguntasExtra: 5
    }
};

const UNIDADES = {
    "V": [["V", 1]],
    "A": [["A", 1], ["mA", 1e-3]],
    "W": [["W", 1], ["mW", 1e-3]],
    "Ω": [["Ω", 1], ["kΩ", 1e3]]
};

const COLOR = {
    cable: "#cbd5e1",
    resistencia: "#f8fafc",
    acento: "#7dd3fc",
    texto: "#e2e8f0",
    suave: "#94a3b8",
    fondo: "#101820",
    borde: "#263b55"
};

const LAYOUT = {
    resistenciaAncho: 150,
    resistenciaAlto: 130,
    resistenciaMedio: 48,
    margenParalelo: 34,
    separacionRamas: 14
};

/* ---------- Referencias al DOM ---------- */

const circuito = document.getElementById("circuito");
const preguntas = document.getElementById("preguntas");
const resultado = document.getElementById("resultado");
const estado = document.getElementById("estado");
const dificultadTexto = document.getElementById("dificultad");
const marcador = document.getElementById("marcador");

/* ---------- Estado global ---------- */

let ejercicio = null;
let dificultadActual = 1;
let mostrandoValores = false;
let botonValores = null;

const racha = { aciertos: 0, intentos: 0, actual: 0, mejor: 0 };

/* ---------- Utilidades ---------- */

function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function elegir(lista) {
    return lista[aleatorio(0, lista.length - 1)];
}

function mezclar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = aleatorio(0, i);
        [lista[i], lista[j]] = [lista[j], lista[i]];
    }
    return lista;
}

function muestra(lista, cantidad) {
    return mezclar(lista.slice()).slice(0, cantidad);
}

function formatear(numero) {
    if (!Number.isFinite(numero)) {
        return "0";
    }
    return String(Number(numero.toPrecision(4)));
}

function crear(etiqueta, clase, contenido) {
    const elemento = document.createElement(etiqueta);
    if (clase) {
        elemento.className = clase;
    }
    if (contenido !== undefined) {
        elemento.textContent = contenido;
    }
    return elemento;
}

/* ---------- Modelo del circuito ----------
   Árbol de nodos:
     { tipo: "R", id, r }          resistencia
     { tipo: "S", hijos: [...] }   grupo en serie
     { tipo: "P", hijos: [...] }   grupo en paralelo
   ------------------------------------------------------------------ */

const S = (...hijos) => ({ tipo: "S", hijos });
const P = (...hijos) => ({ tipo: "P", hijos });

const TOPOLOGIAS = {
    1: [
        { nombre: "Serie", n: 2, armar: r => S(r[0], r[1]) },
        { nombre: "Paralelo", n: 2, armar: r => P(r[0], r[1]) }
    ],
    2: [
        { nombre: "Serie", n: 3, armar: r => S(r[0], r[1], r[2]) },
        { nombre: "Paralelo", n: 3, armar: r => P(r[0], r[1], r[2]) },
        { nombre: "Mixto", n: 3, armar: r => S(r[0], P(r[1], r[2])) },
        { nombre: "Mixto", n: 3, armar: r => P(S(r[0], r[1]), r[2]) }
    ],
    3: [
        { nombre: "Mixto", n: 4, armar: r => S(r[0], P(r[1], r[2]), r[3]) },
        { nombre: "Mixto", n: 4, armar: r => S(P(r[0], r[1]), P(r[2], r[3])) },
        { nombre: "Mixto", n: 4, armar: r => S(r[0], P(S(r[1], r[2]), r[3])) },
        { nombre: "Mixto", n: 4, armar: r => P(S(r[0], r[1]), S(r[2], r[3])) },
        { nombre: "Mixto", n: 4, armar: r => P(S(P(r[0], r[1]), r[2]), r[3]) }
    ]
};

/* Texto de la estructura: "R1 + (R2 ∥ R3)" o con valores "10 + (20 ∥ 30)" */
function expresion(nodo, modo, esRaiz = true) {
    if (nodo.tipo === "R") {
        return modo === "id" ? nodo.id : formatear(nodo.r);
    }
    const separador = nodo.tipo === "S" ? " + " : " ∥ ";
    const texto = nodo.hijos
        .map(h => expresion(h, modo, false))
        .join(separador);
    return esRaiz ? texto : "(" + texto + ")";
}

/* Resistencia equivalente (serie: suma, paralelo: 1 / Σ 1/R) */
function calcularEquivalente(nodo) {
    if (nodo.tipo === "R") {
        nodo.req = nodo.r;
        return nodo.req;
    }
    const valores = nodo.hijos.map(calcularEquivalente);
    if (nodo.tipo === "S") {
        nodo.req = valores.reduce((a, b) => a + b, 0);
    } else {
        nodo.req = 1 / valores.reduce((a, b) => a + 1 / b, 0);
    }
    return nodo.req;
}

/* Reparte voltaje y corriente con la ley de Ohm, de fuera hacia dentro */
function distribuir(nodo, voltaje, corriente) {
    nodo.v = voltaje;
    nodo.i = corriente;
    nodo.p = voltaje * corriente;

    if (nodo.tipo === "R") {
        return;
    }

    for (const hijo of nodo.hijos) {
        if (nodo.tipo === "S") {
            // Serie: misma corriente, V = I × R
            distribuir(hijo, corriente * hijo.req, corriente);
        } else {
            // Paralelo: mismo voltaje, I = V ÷ R
            distribuir(hijo, voltaje, voltaje / hijo.req);
        }
    }
}

function gruposInternos(nodo, lista = [], esRaiz = true) {
    if (nodo.tipo !== "R") {
        if (!esRaiz) {
            lista.push(nodo);
        }
        nodo.hijos.forEach(h => gruposInternos(h, lista, false));
    }
    return lista;
}

function crearEjercicio(nivel) {
    const config = CONFIG[nivel];
    const topologia = elegir(TOPOLOGIAS[nivel]);

    const valores = muestra(config.resistencias, topologia.n);
    const hojas = valores.map((r, i) => ({
        tipo: "R",
        id: "R" + (i + 1),
        r
    }));

    const raiz = topologia.armar(hojas);
    const voltajeBateria = elegir(config.baterias);

    const equivalente = calcularEquivalente(raiz);
    const corrienteTotal = voltajeBateria / equivalente;
    distribuir(raiz, voltajeBateria, corrienteTotal);

    const datos = {
        nivel,
        raiz,
        hojas,
        topologia: topologia.nombre,
        bateria: voltajeBateria,
        req: equivalente,
        itotal: corrienteTotal,
        ptotal: voltajeBateria * corrienteTotal,
        preguntas: [],
        controles: []
    };

    datos.preguntas = generarPreguntas(datos);
    return datos;
}

/* ---------- Preguntas ---------- */

function nuevaPregunta(texto, respuesta, magnitud, pista, solucion) {
    return { texto, respuesta, magnitud, pista, solucion };
}

function nombreGrupo(grupo) {
    const tipo = grupo.tipo === "P" ? "paralelo" : "serie";
    return "grupo en " + tipo + " (" + expresion(grupo, "id") + ")";
}

function preguntaReq(datos) {
    const e = expresion(datos.raiz, "num");
    const nota = e.includes("∥") ? "   (A ∥ B = 1 ÷ (1/A + 1/B))" : "";
    return nuevaPregunta(
        "¿Cuál es la resistencia equivalente del circuito?",
        datos.req,
        "Ω",
        "Resuelve primero los paralelos con 1/Req = 1/Ra + 1/Rb y después suma las resistencias que queden en serie.",
        "Req = " + e + " = " + formatear(datos.req) + " Ω" + nota
    );
}

function preguntaCorrienteTotal(datos) {
    return nuevaPregunta(
        "¿Cuál es la corriente total que entrega la batería?",
        datos.itotal,
        "A",
        "Ley de Ohm: I = V ÷ R, con el voltaje de la batería y la resistencia equivalente.",
        "I = V ÷ Req = " + formatear(datos.bateria) + " ÷ " +
        formatear(datos.req) + " = " + formatear(datos.itotal) + " A"
    );
}

function preguntaPotenciaTotal(datos) {
    return nuevaPregunta(
        "¿Qué potencia total entrega la batería?",
        datos.ptotal,
        "W",
        "P = V × I, con el voltaje de la batería y la corriente total.",
        "P = V × I = " + formatear(datos.bateria) + " × " +
        formatear(datos.itotal) + " = " + formatear(datos.ptotal) + " W"
    );
}

function preguntasResistencia(r) {
    return [
        nuevaPregunta(
            "¿Cuál es el voltaje en " + r.id + "?",
            r.v,
            "V",
            "V = I × R. Averigua qué corriente pasa por " + r.id +
            ". Si está en paralelo, todas las ramas tienen el mismo voltaje.",
            "V = I × R = " + formatear(r.i) + " × " + formatear(r.r) +
            " = " + formatear(r.v) + " V"
        ),
        nuevaPregunta(
            "¿Cuál es la corriente que pasa por " + r.id + "?",
            r.i,
            "A",
            "I = V ÷ R. En serie la corriente es la misma; en paralelo se reparte entre las ramas.",
            "I = V ÷ R = " + formatear(r.v) + " ÷ " + formatear(r.r) +
            " = " + formatear(r.i) + " A"
        ),
        nuevaPregunta(
            "¿Cuál es la potencia disipada en " + r.id + "?",
            r.p,
            "W",
            "P = V × I, usando el voltaje y la corriente de " + r.id + ".",
            "P = V × I = " + formatear(r.v) + " × " + formatear(r.i) +
            " = " + formatear(r.p) + " W"
        )
    ];
}

function preguntasGrupo(g) {
    const nombre = nombreGrupo(g);
    const e = expresion(g, "num");
    const nota = e.includes("∥") ? "   (A ∥ B = 1 ÷ (1/A + 1/B))" : "";
    return [
        nuevaPregunta(
            "¿Cuál es la resistencia equivalente del " + nombre + "?",
            g.req,
            "Ω",
            "Combina solo las resistencias de ese grupo: suma en serie, 1/Req en paralelo.",
            "Req = " + e + " = " + formatear(g.req) + " Ω" + nota
        ),
        nuevaPregunta(
            "¿Qué voltaje hay entre los extremos del " + nombre + "?",
            g.v,
            "V",
            "V = I × R, con la corriente que entra al grupo y su resistencia equivalente.",
            "V = I × Req = " + formatear(g.i) + " × " + formatear(g.req) +
            " = " + formatear(g.v) + " V"
        ),
        nuevaPregunta(
            "¿Qué corriente total atraviesa el " + nombre + "?",
            g.i,
            "A",
            "I = V ÷ R, con el voltaje del grupo y su resistencia equivalente.",
            "I = V ÷ Req = " + formatear(g.v) + " ÷ " + formatear(g.req) +
            " = " + formatear(g.i) + " A"
        )
    ];
}

function generarPreguntas(datos) {
    const obligatorias = [preguntaReq(datos), preguntaCorrienteTotal(datos)];

    const pool = [];
    for (const r of datos.hojas) {
        pool.push(...preguntasResistencia(r));
    }
    pool.push(preguntaPotenciaTotal(datos));
    mezclar(pool);

    const elegidas = [];
    const cantidad = CONFIG[datos.nivel].preguntasExtra;

    if (datos.nivel >= 2) {
        const grupos = gruposInternos(datos.raiz);
        if (grupos.length > 0) {
            elegidas.push(elegir(preguntasGrupo(elegir(grupos))));
        }
    }

    for (const pregunta of pool) {
        if (elegidas.length >= cantidad) {
            break;
        }
        elegidas.push(pregunta);
    }

    return obligatorias.concat(elegidas);
}

/* ---------- Dibujo SVG ---------- */

function linea(x1, y1, x2, y2, color = COLOR.cable, ancho = 4) {
    if (x1 === x2 && y1 === y2) {
        return "";
    }
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${ancho}" stroke-linecap="round"/>`;
}

function texto(x, y, contenido, tamano = 16, color = COLOR.texto, peso = "normal", ancla = "middle") {
    return `<text x="${x}" y="${y}" fill="${color}" font-size="${tamano}" font-weight="${peso}" text-anchor="${ancla}">${contenido}</text>`;
}

function punto(x, y) {
    return `<circle cx="${x}" cy="${y}" r="5" fill="${COLOR.cable}"/>`;
}

/* Calcula tamaño (w, h) y la altura del cable de entrada/salida (mid) */
function medir(nodo) {
    if (nodo.tipo === "R") {
        nodo.w = LAYOUT.resistenciaAncho;
        nodo.h = LAYOUT.resistenciaAlto;
        nodo.mid = LAYOUT.resistenciaMedio;
        return;
    }

    nodo.hijos.forEach(medir);

    if (nodo.tipo === "S") {
        nodo.w = nodo.hijos.reduce((suma, h) => suma + h.w, 0);
        nodo.mid = Math.max(...nodo.hijos.map(h => h.mid));
        nodo.h = Math.max(...nodo.hijos.map(h => nodo.mid - h.mid + h.h));
        return;
    }

    const gap = LAYOUT.separacionRamas;
    nodo.w = Math.max(...nodo.hijos.map(h => h.w)) + 2 * LAYOUT.margenParalelo;
    nodo.h = nodo.hijos.reduce((suma, h) => suma + h.h, 0) + gap * (nodo.hijos.length - 1);

    const primera = nodo.hijos[0].mid;
    let acumulado = 0;
    for (let i = 0; i < nodo.hijos.length - 1; i++) {
        acumulado += nodo.hijos[i].h + gap;
    }
    const ultima = acumulado + nodo.hijos[nodo.hijos.length - 1].mid;
    nodo.mid = (primera + ultima) / 2;
}

function dibujarResistencia(nodo, x, y) {
    const ym = y + LAYOUT.resistenciaMedio;
    const zigzag = [[35, 0], [45, -16], [60, 16], [75, -16], [90, 16], [105, -16], [115, 0]]
        .map(([dx, dy]) => (x + dx) + "," + (ym + dy))
        .join(" ");

    let svg = linea(x, ym, x + 35, ym);
    svg += `<polyline points="${zigzag}" fill="none" stroke="${COLOR.resistencia}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"/>`;
    svg += linea(x + 115, ym, x + 150, ym);
    svg += texto(x + 75, y + 18, nodo.id + " = " + nodo.r + " Ω", 16, COLOR.texto, "bold");

    if (mostrandoValores) {
        svg += texto(x + 75, ym + 36, "V = " + formatear(nodo.v) + " V", 13, COLOR.acento);
        svg += texto(x + 75, ym + 54, "I = " + formatear(nodo.i) + " A", 13, "#86efac");
        svg += texto(x + 75, ym + 72, "P = " + formatear(nodo.p) + " W", 13, "#fde68a");
    }
    return svg;
}

function dibujarNodo(nodo, x, y) {
    if (nodo.tipo === "R") {
        return dibujarResistencia(nodo, x, y);
    }

    if (nodo.tipo === "S") {
        let svg = "";
        let cursor = x;
        for (const hijo of nodo.hijos) {
            svg += dibujarNodo(hijo, cursor, y + nodo.mid - hijo.mid);
            cursor += hijo.w;
        }
        return svg;
    }

    const xi = x + LAYOUT.margenParalelo;
    const xd = x + nodo.w - LAYOUT.margenParalelo;
    const anchoRamas = nodo.w - 2 * LAYOUT.margenParalelo;
    const yMedio = y + nodo.mid;

    let svg = "";
    let cursor = y;
    const alturas = [];

    for (const hijo of nodo.hijos) {
        const ym = cursor + hijo.mid;
        const hx = xi + (anchoRamas - hijo.w) / 2;
        alturas.push(ym);
        svg += linea(xi, ym, hx, ym);
        svg += linea(hx + hijo.w, ym, xd, ym);
        svg += dibujarNodo(hijo, hx, cursor);
        cursor += hijo.h + LAYOUT.separacionRamas;
    }

    const primera = alturas[0];
    const ultima = alturas[alturas.length - 1];

    svg += linea(xi, primera, xi, ultima);
    svg += linea(xd, primera, xd, ultima);
    svg += linea(x, yMedio, xi, yMedio);
    svg += linea(xd, yMedio, x + nodo.w, yMedio);
    svg += punto(xi, yMedio) + punto(xd, yMedio);

    for (const ym of alturas.slice(1, -1)) {
        svg += punto(xi, ym) + punto(xd, ym);
    }
    return svg;
}

function textoPieDelCircuito() {
    if (mostrandoValores) {
        return ejercicio.topologia + ": " + expresion(ejercicio.raiz, "id");
    }
    if (ejercicio.nivel === 1) {
        return "Circuito en " + ejercicio.topologia.toLowerCase();
    }
    return "¿Cómo están conectadas las resistencias?";
}

function construirSVG() {
    const raiz = ejercicio.raiz;
    medir(raiz);

    const anchoCuerpo = Math.max(raiz.w, 320);
    const desplazamiento = (anchoCuerpo - raiz.w) / 2;

    const izquierda = 60;
    const cuerpoX = izquierda + 70;
    const cuerpoY = 80;
    const derecha = cuerpoX + anchoCuerpo + 70;
    const yTerminal = cuerpoY + raiz.mid;
    const yBase = cuerpoY + raiz.h + 80;

    const ancho = derecha + 60;
    const alto = yBase + 100;
    const cx = (izquierda + derecha) / 2;
    const yFlecha = (yTerminal + yBase) / 2;

    let svg = `<rect x="4" y="4" width="${ancho - 8}" height="${alto - 8}" rx="20" fill="${COLOR.fondo}" stroke="${COLOR.borde}" stroke-width="2"/>`;

    svg += texto(ancho / 2, 42, textoPieDelCircuito(), 19, COLOR.acento, "bold");

    // Cables exteriores
    svg += linea(izquierda, yTerminal, cuerpoX + desplazamiento, yTerminal);
    svg += linea(cuerpoX + desplazamiento + raiz.w, yTerminal, derecha, yTerminal);
    svg += linea(izquierda, yTerminal, izquierda, yBase);
    svg += linea(derecha, yTerminal, derecha, yBase);

    // Cuerpo del circuito
    svg += dibujarNodo(raiz, cuerpoX + desplazamiento, cuerpoY);

    // Batería (+ a la izquierda: la corriente sale hacia arriba)
    svg += linea(izquierda, yBase, cx - 12, yBase);
    svg += linea(cx + 12, yBase, derecha, yBase);
    svg += linea(cx - 12, yBase - 28, cx - 12, yBase + 28, COLOR.acento, 6);
    svg += linea(cx + 12, yBase - 16, cx + 12, yBase + 16, COLOR.acento, 6);
    svg += texto(cx - 32, yBase - 22, "+", 22, COLOR.acento, "bold");
    svg += texto(cx + 32, yBase - 22, "−", 22, COLOR.acento, "bold");
    svg += texto(cx, yBase + 60, "B1 = " + ejercicio.bateria + " V", 20, COLOR.texto, "bold");

    // Flecha del sentido de la corriente
    svg += `<polygon points="${izquierda},${yFlecha - 13} ${izquierda - 10},${yFlecha + 7} ${izquierda + 10},${yFlecha + 7}" fill="${COLOR.acento}"/>`;
    svg += texto(izquierda + 16, yFlecha + 5, mostrandoValores ? "I = " + formatear(ejercicio.itotal) + " A" : "I", 14, COLOR.acento, "bold", "start");

    return `<svg viewBox="0 0 ${ancho} ${alto}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama del circuito" style="display:block;width:100%;height:auto;font-family:Arial,sans-serif;">${svg}</svg>`;
}

function dibujarCircuito() {
    if (!ejercicio || !circuito) {
        return;
    }
    circuito.innerHTML = construirSVG();
}

/* ---------- Interfaz de preguntas ---------- */

function contarEstado(valor) {
    return ejercicio.controles.filter(c => c.estado === valor).length;
}

function mostrarResultado(mensaje, clase) {
    if (!resultado) {
        return;
    }
    resultado.textContent = mensaje;
    resultado.className = "resultado-practica" + (clase ? " " + clase : "");
}

function actualizarMarcador() {
    if (!marcador) {
        return;
    }
    marcador.textContent =
        "Aciertos: " + racha.aciertos +
        " · Intentos: " + racha.intentos +
        " · Racha: " + racha.actual +
        " (mejor " + racha.mejor + ")";
}

function actualizarProgreso() {
    const total = ejercicio.preguntas.length;
    const correctas = contarEstado("correcta");
    const reveladas = contarEstado("revelada");

    if (correctas + reveladas === total) {
        if (reveladas === 0) {
            mostrarResultado("¡Circuito resuelto! Respondiste todo correctamente.", "correcto");
        } else {
            mostrarResultado(
                "Ejercicio terminado: " + correctas + " de " + total + " correctas.",
                "revelado"
            );
        }
        return;
    }

    let mensaje = "Progreso: " + correctas + " de " + total + " correctas";
    if (reveladas > 0) {
        mensaje += " · " + reveladas + " revelada(s)";
    }
    mostrarResultado(mensaje);
}

function bloquearControl(control) {
    control.entrada.disabled = true;
    if (control.select) {
        control.select.disabled = true;
    }
    control.botonComprobar.disabled = true;
    control.botonRevelar.disabled = true;
}

function avisar(control, texto, clase) {
    control.mensaje.textContent = texto;
    control.mensaje.className = "resultado-practica " + clase;
}

function comprobarRespuesta(indice) {
    const control = ejercicio.controles[indice];
    const pregunta = ejercicio.preguntas[indice];

    if (control.estado !== "pendiente") {
        return;
    }

    const texto = control.entrada.value.trim();
    if (texto === "") {
        avisar(control, "Escribe una respuesta.", "incorrecto");
        return;
    }

    const valor = Number(texto);
    if (!Number.isFinite(valor)) {
        avisar(control, "Introduce un número válido.", "incorrecto");
        return;
    }

    const factor = control.select ? Number(control.select.value) : 1;
    const obtenido = valor * factor;
    const esperado = pregunta.respuesta;

    // Margen del 2 % (hasta 5 % si solo redondeó a 3 decimales)
    const tolerancia = Math.max(
        Math.abs(esperado) * TOLERANCIA_RELATIVA,
        Math.min(0.0005 * factor, Math.abs(esperado) * 0.05)
    );

    racha.intentos++;

    if (Math.abs(obtenido - esperado) <= tolerancia) {
        racha.aciertos++;
        racha.actual++;
        racha.mejor = Math.max(racha.mejor, racha.actual);

        control.estado = "correcta";
        bloquearControl(control);
        avisar(control, "✓ ¡Correcto!  " + pregunta.solucion, "correcto");
    } else {
        racha.actual = 0;
        avisar(control, "✗ Incorrecto. Revisa la pista e inténtalo de nuevo.", "incorrecto");
    }

    actualizarMarcador();
    actualizarProgreso();
}

function revelarRespuesta(indice) {
    const control = ejercicio.controles[indice];
    const pregunta = ejercicio.preguntas[indice];

    if (control.estado !== "pendiente") {
        return;
    }

    control.estado = "revelada";
    racha.actual = 0;
    bloquearControl(control);
    avisar(
        control,
        "Respuesta: " + formatear(pregunta.respuesta) + " " + pregunta.magnitud +
        "  ·  " + pregunta.solucion,
        "revelado"
    );

    actualizarMarcador();
    actualizarProgreso();
}

function alternarPista(indice) {
    const control = ejercicio.controles[indice];
    control.pista.hidden = !control.pista.hidden;
    control.botonPista.textContent = control.pista.hidden ? "Pista" : "Ocultar pista";
}

function crearBloquePregunta(pregunta, indice) {
    const bloque = crear("div", "pregunta");
    bloque.appendChild(crear("p", null, (indice + 1) + ". " + pregunta.texto));

    // Entrada + unidad
    const fila = crear("div", "entrada-respuesta");
    const entrada = crear("input");
    entrada.type = "number";
    entrada.step = "any";
    entrada.placeholder = "Respuesta";
    entrada.setAttribute("aria-label", pregunta.texto);
    fila.appendChild(entrada);

    let select = null;
    const opciones = UNIDADES[pregunta.magnitud];
    if (opciones.length > 1) {
        select = crear("select", "unidad-select");
        for (const [nombre, factor] of opciones) {
            const opcion = crear("option", null, nombre);
            opcion.value = String(factor);
            select.appendChild(opcion);
        }
        fila.appendChild(select);
    } else {
        fila.appendChild(crear("span", null, pregunta.magnitud));
    }

    // Botones
    const botones = crear("div", "botones-practica");

    const botonComprobar = crear("button", "btn-enviar", "Comprobar");
    botonComprobar.type = "button";

    const botonPista = crear("button", "btn-secundario", "Pista");
    botonPista.type = "button";

    const botonRevelar = crear("button", "btn-secundario", "Ver respuesta");
    botonRevelar.type = "button";

    botones.appendChild(botonComprobar);
    botones.appendChild(botonPista);
    botones.appendChild(botonRevelar);

    const pista = crear("div", "pista-practica", "Pista: " + pregunta.pista);
    pista.hidden = true;

    const mensaje = crear("div", "resultado-practica");

    bloque.appendChild(fila);
    bloque.appendChild(botones);
    bloque.appendChild(pista);
    bloque.appendChild(mensaje);

    ejercicio.controles[indice] = {
        entrada,
        select,
        mensaje,
        pista,
        botonComprobar,
        botonPista,
        botonRevelar,
        estado: "pendiente"
    };

    botonComprobar.onclick = () => comprobarRespuesta(indice);
    botonPista.onclick = () => alternarPista(indice);
    botonRevelar.onclick = () => revelarRespuesta(indice);
    entrada.onkeydown = evento => {
        if (evento.key === "Enter") {
            comprobarRespuesta(indice);
        }
    };

    return bloque;
}

function alternarValores() {
    
    if (botonValores) {
        botonValores.textContent = mostrandoValores
            ? "Ocultar valores del circuito"
            : "Mostrar valores en el circuito";
    }
    dibujarCircuito();
}

function mostrarPreguntas() {
    preguntas.innerHTML = "";
    ejercicio.controles = [];

    const titulo = crear("h2", null, "Resuelve el ejercicio");
    titulo.style.color = COLOR.acento;
    preguntas.appendChild(titulo);

    preguntas.appendChild(crear(
        "p",
        "ayuda-practica",
        "Usa la Ley de Ohm (V = I × R) y P = V × I. Puedes cambiar la unidad (mA, mW, kΩ) de cada respuesta."
    ));

    ejercicio.preguntas.forEach((pregunta, indice) => {
        preguntas.appendChild(crearBloquePregunta(pregunta, indice));
    });

    const acciones = crear("div", "acciones-practica");

    botonValores = crear("button", "btn-secundario", "Mostrar valores en el circuito");
    botonValores.type = "button";
    botonValores.onclick = alternarValores;

    const siguiente = crear("button", "btn-siguiente", "Generar otro circuito");
    siguiente.type = "button";
    siguiente.onclick = () => generarEjercicio(dificultadActual);

    acciones.appendChild(botonValores);
    acciones.appendChild(siguiente);
    preguntas.appendChild(acciones);
}

/* ---------- Control general ---------- */

function mostrarEstado(mensaje) {
    if (estado) {
        estado.textContent = mensaje;
    }
}

function actualizarNiveles() {
    for (let i = 1; i <= 3; i++) {
        const boton = document.getElementById("nivel-" + i);
        if (boton) {
            boton.classList.toggle("activo", i === dificultadActual);
            boton.setAttribute("aria-pressed", String(i === dificultadActual));
        }
    }
}

function generarEjercicio(nivel) {
    let numero = Number(nivel);
    if (![1, 2, 3].includes(numero)) {
        numero = 1;
    }

    dificultadActual = numero;
    mostrandoValores = false;
    actualizarNiveles();

    dificultadTexto.textContent = "Dificultad: " + NOMBRES_NIVEL[numero];

    ejercicio = crearEjercicio(numero);

    dibujarCircuito();
    mostrarPreguntas();

    mostrarEstado(
        ejercicio.hojas.length + " resistencias · batería de " + ejercicio.bateria + " V"
    );
    actualizarMarcador();
    actualizarProgreso();
}

// El HTML llama a esta función desde los botones de nivel
function cambiarDificultad(valor) {
    generarEjercicio(valor);
}

function iniciar() {
    if (!circuito || !preguntas || !resultado || !estado || !dificultadTexto) {
        console.error("Faltan elementos en el HTML del laboratorio.");
        return;
    }
    generarEjercicio(1);
}

iniciar();
