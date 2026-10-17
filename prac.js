let ejercicio = null;
let dificultadActual = 1;

const circuito = document.getElementById("circuito");
const preguntas = document.getElementById("preguntas");
const resultado = document.getElementById("resultado");
const estado = document.getElementById("estado");
const dificultadTexto = document.getElementById("dificultad");

function aleatorio(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function redondear(numero) {
    return Math.round(numero * 10000) / 10000;
}

function decimal(min, max, cantidad = 1) {
    const factor = Math.pow(10, cantidad);
    return Math.round(
        (Math.random() * (max - min) + min) * factor
    ) / factor;
}

function crearResistencia(id) {
    return {
        id: "R" + id,
        r: aleatorio(10, 100),
        v: 0,
        i: 0,
        p: 0
    };
}

function crearCircuito(dificultad) {
    const datos = {
        bateria: {
            id: "B1",
            v: aleatorio(6, 12)
        },
        resistencias: [],
        led: null,
        tipo: "serie"
    };
    if (dificultad === 1) {
        datos.resistencias.push(crearResistencia(1));
        datos.resistencias.push(crearResistencia(2));
        datos.tipo = Math.random() < 0.5 ? "serie" : "paralelo";
    } else if (dificultad === 2) {
        datos.resistencias.push(crearResistencia(1));
        datos.resistencias.push(crearResistencia(2));
        datos.resistencias.push(crearResistencia(3));
        const tipos = ["serie", "paralelo", "mixto"];
        datos.tipo = tipos[aleatorio(0, 2)];
        datos.led = {
            id: "LED1",
            v: decimal(1.8, 2.2, 1),
            i: 0,
            p: 0
        };
    } else {
        datos.resistencias.push(crearResistencia(1));
        datos.resistencias.push(crearResistencia(2));
        datos.resistencias.push(crearResistencia(3));
        datos.resistencias.push(crearResistencia(4));
        datos.tipo = "mixto";
        datos.led = {
            id: "LED1",
            v: decimal(1.8, 2.2, 1),
            i: 0,
            p: 0
        };
    }
    return datos;
}

function calcularSerie(datos) {
    let voltaje = datos.bateria.v;
    if (datos.led) {
        voltaje -= datos.led.v;
    }
    if (voltaje < 0) {
        voltaje = 0;
    }
    let resistenciaTotal = 0;
    for (const r of datos.resistencias) {
        resistenciaTotal += r.r;
    }
    let corrienteTotal = 0;
    if (resistenciaTotal > 0) {
        corrienteTotal = voltaje / resistenciaTotal;
    }
    for (const r of datos.resistencias) {
        r.i = corrienteTotal;
        r.v = corrienteTotal * r.r;
        r.p = r.v * r.i;
    }
    if (datos.led) {
        datos.led.i = corrienteTotal;
        datos.led.p = datos.led.v * datos.led.i;
    }
    return {
        resistenciaTotal,
        corrienteTotal,
        potenciaTotal: datos.bateria.v * corrienteTotal
    };
}

function calcularParalelo(datos) {
    const voltaje = datos.bateria.v;
    let suma = 0;
    for (const r of datos.resistencias) {
        suma += 1 / r.r;
    }
    const resistenciaTotal = 1 / suma;
    let corrienteTotal = 0;
    for (const r of datos.resistencias) {
        r.v = voltaje;
        r.i = voltaje / r.r;
        r.p = r.v * r.i;
        corrienteTotal += r.i;
    }
    if (datos.led) {
        datos.led.i = 0;
        datos.led.p = 0;
    }
    return {
        resistenciaTotal,
        corrienteTotal,
        potenciaTotal: voltaje * corrienteTotal
    };
}

function calcularMixto(datos) {
    const r1 = datos.resistencias[0];
    const r2 = datos.resistencias[1];
    const r3 = datos.resistencias[2];
    const paralelo = 1 / ((1 / r2.r) + (1 / r3.r));
    const resistenciaTotal = r1.r + paralelo;
    const corrienteTotal = datos.bateria.v / resistenciaTotal;
    const voltajeR1 = corrienteTotal * r1.r;
    const voltajeParalelo = datos.bateria.v - voltajeR1;
    const corrienteR2 = voltajeParalelo / r2.r;
    const corrienteR3 = voltajeParalelo / r3.r;
    r1.v = voltajeR1;
    r1.i = corrienteTotal;
    r1.p = r1.v * r1.i;
    r2.v = voltajeParalelo;
    r2.i = corrienteR2;
    r2.p = r2.v * r2.i;
    r3.v = voltajeParalelo;
    r3.i = corrienteR3;
    r3.p = r3.v * r3.i;
    if (datos.led) {
        datos.led.i = corrienteTotal;
        datos.led.p = datos.led.v * datos.led.i;
    }
    return {
        resistenciaTotal,
        corrienteTotal,
        potenciaTotal: datos.bateria.v * corrienteTotal
    };
}

function calcular(datos) {
    if (datos.tipo === "serie") {
        return calcularSerie(datos);
    }
    if (datos.tipo === "paralelo") {
        return calcularParalelo(datos);
    }
    return calcularMixto(datos);
}

function agregarPregunta(lista, texto, respuesta, unidad) {
    lista.push({
        texto,
        respuesta: redondear(respuesta),
        unidad
    });
}

function generarPreguntas(datos, resultados, dificultad) {
    const lista = [];
    for (const r of datos.resistencias) {
        agregarPregunta(lista, "¿Cuál es la resistencia de " + r.id + "?", r.r, "Ω");
        agregarPregunta(lista, "¿Cuál es el voltaje en " + r.id + "?", r.v, "V");
        agregarPregunta(lista, "¿Cuál es la corriente que pasa por " + r.id + "?", r.i, "A");
        agregarPregunta(lista, "¿Cuál es la potencia de " + r.id + "?", r.p, "W");
    }
    if (datos.led) {
        agregarPregunta(lista, "¿Cuál es el voltaje del LED?", datos.led.v, "V");
        agregarPregunta(lista, "¿Cuál es la corriente del LED?", datos.led.i, "A");
        agregarPregunta(lista, "¿Cuál es la potencia del LED?", datos.led.p, "W");
    }
    agregarPregunta(lista, "¿Cuál es la resistencia equivalente del circuito?", resultados.resistenciaTotal, "Ω");
    agregarPregunta(lista, "¿Cuál es la corriente total del circuito?", resultados.corrienteTotal, "A");
    agregarPregunta(lista, "¿Cuál es la potencia total del circuito?", resultados.potenciaTotal, "W");
    mezclar(lista);
    if (dificultad === 1) {
        return lista.slice(0, 2);
    }
    if (dificultad === 2) {
        return lista.slice(0, 4);
    }
    return lista.slice(0, 6);
}

function mezclar(lista) {
    for (let i = lista.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temporal = lista[i];
        lista[i] = lista[j];
        lista[j] = temporal;
    }
    return lista;
}

function generarEjercicio(dificultad) {
    dificultadActual = Number(dificultad);
    if (dificultadActual < 1 || dificultadActual > 3) {
        dificultadActual = 1;
    }
    actualizarNiveles();
    const nombres = ["", "Fácil", "Medio", "Difícil"];
    dificultadTexto.textContent = "Dificultad: " + nombres[dificultadActual];
    mostrarEstado("Generando circuito...");
    const datos = crearCircuito(dificultadActual);
    const resultados = calcular(datos);
    const listaPreguntas = generarPreguntas(datos, resultados, dificultadActual);
    ejercicio = {
        datos,
        resultados,
        preguntas: listaPreguntas
    };
    dibujarCircuito();
    mostrarPreguntas();
    mostrarEstado("Motor JavaScript activo");
    mostrarResultado("Circuito generado correctamente.");
}

function cambiarDificultad(valor) {
    generarEjercicio(valor);
}

function actualizarNiveles() {
    for (let i = 1; i <= 3; i++) {
        const boton = document.getElementById("nivel-" + i);
        if (boton) {
            boton.classList.toggle("activo", i === dificultadActual);
        }
    }
}

function svgInicio() {
    return `
<svg
    viewBox="0 0 900 450"
    width="100%"
    height="auto"
    xmlns="http://www.w3.org/2000/svg"
>
    <rect
        x="10"
        y="10"
        width="880"
        height="430"
        rx="20"
        fill="#101820"
        stroke="#263b55"
        stroke-width="2"
    />
    <g
        id="elementos-circuito"
        font-family="Arial, sans-serif"
    ></g>
</svg>
`;
}

function linea(x1, y1, x2, y2) {
    return `
<line
    x1="${x1}"
    y1="${y1}"
    x2="${x2}"
    y2="${y2}"
    stroke="#cbd5e1"
    stroke-width="4"
    stroke-linecap="round"
/>
`;
}

function texto(x, y, contenido, tamaño = 17) {
    return `
<text
    x="${x}"
    y="${y}"
    fill="#e2e8f0"
    font-size="${tamaño}"
    text-anchor="middle"
>
    ${contenido}
</text>
`;
}

function bateria(x, y) {
    return `
<g>
    <line
        x1="${x - 45}"
        y1="${y}"
        x2="${x - 15}"
        y2="${y}"
        stroke="#cbd5e1"
        stroke-width="4"
    />
    <line
        x1="${x - 15}"
        y1="${y - 30}"
        x2="${x - 15}"
        y2="${y + 30}"
        stroke="#7dd3fc"
        stroke-width="6"
    />
    <line
        x1="${x + 10}"
        y1="${y - 18}"
        x2="${x + 10}"
        y2="${y + 18}"
        stroke="#7dd3fc"
        stroke-width="5"
    />
    <line
        x1="${x + 10}"
        y1="${y}"
        x2="${x + 45}"
        y2="${y}"
        stroke="#cbd5e1"
        stroke-width="4"
    />
    ${texto(x, y + 65, "B1 = " + ejercicio.datos.bateria.v + " V", 20)}
</g>
`;
}

function resistencia(x, y, datos) {
    return `
<g>
    <line
        x1="${x - 70}"
        y1="${y}"
        x2="${x - 38}"
        y2="${y}"
        stroke="#cbd5e1"
        stroke-width="4"
    />
    <polyline
        points="
        ${x - 38},${y}
        ${x - 28},${y - 18}
        ${x - 12},${y + 18}
        ${x + 4},${y - 18}
        ${x + 20},${y + 18}
        ${x + 38},${y}
        "
        fill="none"
        stroke="#f8fafc"
        stroke-width="5"
    />
    <line
        x1="${x + 38}"
        y1="${y}"
        x2="${x + 70}"
        y2="${y}"
        stroke="#cbd5e1"
        stroke-width="4"
    />
    ${texto(x, y - 32, datos.id + " = " + datos.r + " Ω", 18)}
</g>
`;
}

function led(x, y) {
    if (!ejercicio.datos.led) {
        return "";
    }
    const valor = ejercicio.datos.led.v;
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
        ${x - 28},${y - 27}
        ${x + 25},${y}
        ${x - 28},${y + 27}
        "
        fill="#172a3d"
        stroke="#f8fafc"
        stroke-width="4"
    />
    <line
        x1="${x + 25}"
        y1="${y - 28}"
        x2="${x + 25}"
        y2="${y + 28}"
        stroke="#7dd3fc"
        stroke-width="5"
    />
    <line
        x1="${x - 5}"
        y1="${y - 42}"
        x2="${x + 20}"
        y2="${y - 70}"
        stroke="#7dd3fc"
        stroke-width="3"
    />
    <line
        x1="${x + 10}"
        y1="${y - 37}"
        x2="${x + 35}"
        y2="${y - 65}"
        stroke="#7dd3fc"
        stroke-width="3"
    />
    <line
        x1="${x + 25}"
        y1="${y}"
        x2="${x + 65}"
        y2="${y}"
        stroke="#cbd5e1"
        stroke-width="4"
    />
    ${texto(x, y + 65, "LED1 = " + valor + " V", 18)}
</g>
`;
}

function dibujarSerie() {
    let svg = svgInicio();
    let elementos = "";
    const y = 220;
    elementos += bateria(90, y);
    elementos += linea(135, y, 170, y);
    let x = 240;
    for (let i = 0; i < ejercicio.datos.resistencias.length; i++) {
        const r = ejercicio.datos.resistencias[i];
        elementos += resistencia(x, y, r);
        x += 150;
        if (i < ejercicio.datos.resistencias.length - 1) {
            elementos += linea(x - 80, y, x - 60, y);
        }
    }
    if (ejercicio.datos.led) {
        elementos += led(x, y);
        elementos += linea(x + 65, y, 800, y);
    } else {
        elementos += linea(x - 70, y, 800, y);
    }
    elementos += linea(800, y, 800, 350);
    elementos += linea(800, 350, 90, 350);
    elementos += linea(90, 350, 90, y);
    elementos += texto(450, 410, "Circuito en serie", 23);
    svg = svg.replace(
        '<g id="elementos-circuito" font-family="Arial, sans-serif"></g>',
        '<g id="elementos-circuito" font-family="Arial, sans-serif">' + elementos + '</g>'
    );
    circuito.innerHTML = svg;
}

function dibujarParalelo() {
    let svg = svgInicio();
    let elementos = "";
    const izquierda = 230;
    const derecha = 670;
    elementos += bateria(90, 225);
    elementos += linea(135, 225, izquierda, 225);
    elementos += linea(izquierda, 120, izquierda, 330);
    elementos += linea(derecha, 120, derecha, 330);
    const posiciones = [140, 225, 310];
    for (let i = 0; i < ejercicio.datos.resistencias.length; i++) {
        const r = ejercicio.datos.resistencias[i];
        const y = posiciones[i] || 225;
        elementos += linea(izquierda, y, 330, y);
        elementos += resistencia(400, y, r);
        elementos += linea(470, y, derecha, y);
    }
    elementos += linea(derecha, 225, 800, 225);
    elementos += linea(800, 225, 800, 350);
    elementos += linea(800, 350, 90, 350);
    elementos += linea(90, 350, 90, 225);
    elementos += texto(450, 410, "Circuito en paralelo", 23);
    svg = svg.replace(
        '<g id="elementos-circuito" font-family="Arial, sans-serif"></g>',
        '<g id="elementos-circuito" font-family="Arial, sans-serif">' + elementos + '</g>'
    );
    circuito.innerHTML = svg;
}

function dibujarMixto() {
    let svg = svgInicio();
    let elementos = "";
    const r = ejercicio.datos.resistencias;
    elementos += bateria(90, 225);
    elementos += linea(135, 225, 175, 225);
    elementos += resistencia(245, 225, r[0]);
    elementos += linea(315, 225, 370, 225);
    elementos += linea(370, 225, 370, 135);
    elementos += linea(370, 225, 370, 315);
    elementos += linea(370, 135, 430, 135);
    elementos += resistencia(500, 135, r[1]);
    elementos += linea(570, 135, 650, 135);
    elementos += linea(370, 315, 430, 315);
    elementos += resistencia(500, 315, r[2]);
    elementos += linea(570, 315, 650, 315);
    elementos += linea(650, 135, 650, 315);
    elementos += linea(650, 225, 800, 225);
    elementos += linea(800, 225, 800, 350);
    elementos += linea(800, 350, 90, 350);
    elementos += linea(90, 350, 90, 225);
    elementos += texto(500, 75, "R1 + (R2 || R3)", 23);
    elementos += texto(510, 105, "R2 y R3 están en paralelo", 16);
    svg = svg.replace(
        '<g id="elementos-circuito" font-family="Arial, sans-serif"></g>',
        '<g id="elementos-circuito" font-family="Arial, sans-serif">' + elementos + '</g>'
    );
    circuito.innerHTML = svg;
}

function dibujarCircuito() {
    if (!ejercicio) {
        return;
    }
    if (ejercicio.datos.tipo === "serie") {
        dibujarSerie();
    } else if (ejercicio.datos.tipo === "paralelo") {
        dibujarParalelo();
    } else {
        dibujarMixto();
    }
}

function mostrarPreguntas() {
    preguntas.innerHTML = "";
    const titulo = document.createElement("h2");
    titulo.textContent = "Resuelve el ejercicio";
    titulo.style.color = "#7dd3fc";
    preguntas.appendChild(titulo);

    for (let i = 0; i < ejercicio.preguntas.length; i++) {
        const pregunta = ejercicio.preguntas[i];
        const bloque = document.createElement("div");
        bloque.className = "pregunta";

        const textoPregunta = document.createElement("p");
        textoPregunta.textContent = pregunta.texto;

        const entrada = document.createElement("input");
        entrada.type = "number";
        entrada.step = "any";
        entrada.placeholder = "Respuesta";

        const unidad = document.createElement("span");
        unidad.textContent = pregunta.unidad;

        const contenedorEntrada = document.createElement("div");
        contenedorEntrada.className = "entrada-respuesta";
        contenedorEntrada.appendChild(entrada);
        contenedorEntrada.appendChild(unidad);

        const botones = document.createElement("div");
        botones.className = "botones-practica";

        const comprobar = document.createElement("button");
        comprobar.type = "button";
        comprobar.className = "btn-enviar";
        comprobar.textContent = "Comprobar";

        const mensaje = document.createElement("div");
        mensaje.className = "resultado-practica";

        comprobar.onclick = function () {
            comprobarRespuesta(i, entrada, mensaje, comprobar);
        };

        entrada.onkeydown = function (evento) {
            if (evento.key === "Enter") {
                comprobar.click();
            }
        };

        botones.appendChild(comprobar);
        bloque.appendChild(textoPregunta);
        bloque.appendChild(contenedorEntrada);
        bloque.appendChild(botones);
        bloque.appendChild(mensaje);
        preguntas.appendChild(bloque);
    }

    const siguiente = document.createElement("button");
    siguiente.type = "button";
    siguiente.className = "btn-siguiente";
    siguiente.textContent = "Generar otro circuito";
    siguiente.onclick = function () {
        generarEjercicio(dificultadActual);
    };
    preguntas.appendChild(siguiente);
}

function comprobarRespuesta(numero, entrada, mensaje, boton) {
    if (entrada.value.trim() === "") {
        mensaje.textContent = "Escribe una respuesta.";
        mensaje.className = "resultado-practica incorrecto";
        return;
    }
    const valor = Number(entrada.value);
    if (!Number.isFinite(valor)) {
        mensaje.textContent = "Introduce un número válido.";
        mensaje.className = "resultado-practica incorrecto";
        return;
    }
    const correcta = ejercicio.preguntas[numero].respuesta;
    const tolerancia = Math.max(0.000001, Math.abs(correcta) * 0.01);
    if (Math.abs(valor - correcta) <= tolerancia) {
        mensaje.textContent = "✓ ¡Correcto!";
        mensaje.className = "resultado-practica correcto";
        entrada.disabled = true;
        boton.disabled = true;
    } else {
        mensaje.textContent = "✗ Incorrecto. Inténtalo nuevamente.";
        mensaje.className = "resultado-practica incorrecto";
    }
}

function mostrarResultado(texto) {
    resultado.textContent = texto;
    resultado.className = "resultado-practica";
}

function mostrarEstado(texto) {
    if (estado) {
        estado.textContent = texto;
    }
}

function iniciar() {
    if (!circuito || !preguntas || !resultado || !estado || !dificultadTexto) {
        return;
    }
    generarEjercicio(1);
}

iniciar();
