// webapp/app.js

// --- IMPORTACIONES ---
// Carga las variables de entorno desde el archivo .env
// ¡IMPORTANTE! Este debe ser el primer require() en tu archivo.
const path = require('path'); // Importa el módulo path
// Especifica la ruta del .env para asegurar que se encuentre en el directorio actual (webapp/)
require('dotenv').config(); 

const express = require('express');
const { OpenAI } = require('openai'); // Importa la biblioteca de OpenAI
const cookieParser = require('cookie-parser'); // Importa cookie-parser para leer cookies

// --- INICIALIZACIÓN DE EXPRESS ---
const app = express();
const port = process.env.PORT || 3000; // Puedes usar el puerto que prefieras, o el de una variable de entorno

// --- CONFIGURACIÓN DE EXPRESS ---
// Configura EJS como el motor de vistas
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true })); // Para parsear formularios
app.use(express.json()); // Para parsear JSON (necesario para el chatbot)
app.use(express.static(path.join(__dirname, 'public'))); // Para servir archivos estáticos (CSS, JS del cliente, etc.)
app.use(cookieParser()); // Usa cookie-parser para acceder a las cookies

// Middleware para establecer el estado del modo oscuro en res.locals
app.use((req, res, next) => {
    res.locals.isDarkMode = req.cookies.isDarkMode === 'true';
    next();
});

// --- CONFIGURACIÓN DE LA API DE DEEPSEEK (OpenRouter) ---

// *********** INICIO DE DEPURACIÓN CRÍTICA ***********
console.log('--- Depuración de OPENROUTER_API_KEY en app.js ---');
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
console.log('Valor de process.env.OPENROUTER_API_KEY:', openRouterApiKey);

if (!openRouterApiKey || openRouterApiKey.trim() === '' || openRouterApiKey.trim() === '<sk-or-v1-a7cea23b86884e4e50457f753c6de7f8c387277cb6f3875c21a1cd25d38fe9>') {
    console.error('¡ERROR CRÍTICO! La clave OPENROUTER_API_KEY no está configurada correctamente o es el placeholder.');
    console.error('Asegúrate de que tu archivo .env (en webapp/.env) contenga la clave API real de OpenRouter.');
    console.error('El chatbot NO funcionará sin una clave API válida.');
} else {
    console.log('OPENROUTER_API_KEY parece estar cargada. Primeros 5 caracteres:', openRouterApiKey.substring(0, 5) + '...');
}
console.log('---------------------------------------');
// *********** FIN DE DEPURACIÓN CRÍTICA ***********


// Inicializa el cliente de OpenAI apuntando a OpenRouter
const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: openRouterApiKey, // Usa la variable que acabamos de verificar
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:3000', // URL del sitio para rankings
    'X-Title': process.env.OPENROUTER_SITE_NAME || 'MathMaster Local', // Título del sitio para rankings
  },
});

// ====================================================================
// *** FUNCIONES DE LÓGICA MATEMÁTICA (EJEMPLOS SIMPLIFICADOS) ***
// ====================================================================

/**
 * Analiza un polinomio simple y devuelve una explicación básica.
 * Esta es una implementación MUY simplificada y no maneja todos los casos.
 * Para un análisis robusto, se recomienda una librería matemática.
 * @param {string} polinomioString El polinomio como una cadena de texto (ej. "x^2+3x-1")
 * @returns {string} Una explicación generada.
 */
function analizarPolinomioSimple(polinomioString) {
    polinomioString = polinomioString.toLowerCase().replace(/\s/g, ''); // Limpia espacios y convierte a minúsculas
    let explicacion = `Analizando el polinomio: ${polinomioString}\n\n`;

    let grado = 0;
    let coeficientesInfo = [];
    let constante = 0;

    // Mejora la expresión regular para capturar términos.
    // Captura:
    // 1. Signo opcional ([+-]?)
    // 2. Coeficiente opcional (\d*\.?\d*) - permite enteros o decimales, o vacío para coeficientes de 1 o -1
    // 3. 'x' opcional (x?)
    // 4. Exponente opcional ((\^\d+)?) - permite '^' seguido de dígitos
    // 'g' al final es para encontrar todas las ocurrencias.
    const termRegex = /([+-]?\d*\.?\d*x(\^\d+)?)|([+-]?\d+\.?\d*)/g;
    const rawTerms = polinomioString.match(termRegex);

    if (!rawTerms) {
        return `No se pudo analizar el polinomio: ${polinomioString}. Asegúrate de que el formato sea correcto (ej. x^2+3x-1, 2x-5, 7).`;
    }

    for (const rawTerm of rawTerms) {
        let term = rawTerm.trim();
        let currentCoef = 0;
        let currentExponent = 0;
        
        // Si el término contiene 'x'
        if (term.includes('x')) {
            // Extrae el exponente
            const exponentMatch = term.match(/x\^(\d+)/);
            if (exponentMatch && exponentMatch[1]) {
                currentExponent = parseInt(exponentMatch[1]);
            } else { // Si hay 'x' pero no un exponente explícito (ej. 'x', '2x')
                currentExponent = 1;
            }

            // Extrae el coeficiente
            let coefPart = term.split('x')[0];
            if (coefPart === '' || coefPart === '+') { // Si es solo 'x' o '+x'
                currentCoef = 1;
            } else if (coefPart === '-') { // Si es '-x'
                currentCoef = -1;
            } else {
                currentCoef = parseFloat(coefPart);
            }
            
            // Actualiza el grado si el exponente actual es mayor
            if (currentExponent > grado) {
                grado = currentExponent;
            }
            coeficientesInfo.push(`Término con x^${currentExponent}: Coeficiente ${currentCoef}`);
        } else {
            // Término constante (no contiene 'x')
            constante += parseFloat(term);
        }
    }

    explicacion += `Este es un polinomio de grado ${grado}.\n`;

    if (coeficientesInfo.length > 0) {
        explicacion += `\nComponentes:\n`;
        explicacion += coeficientesInfo.map(info => `- ${info}`).join('\n');
    }
    if (constante !== 0 || !polinomioString.includes('x')) { // Muestra la constante si existe o si es solo un número
        explicacion += `\nTérmino constante: ${constante}`;
    }

    explicacion += `\n\nPasos conceptuales para un análisis más profundo:\n`;
    explicacion += `1. Identificar el grado del polinomio (el exponente más alto de x).\n`;
    explicacion += `2. Determinar los coeficientes de cada término.\n`;
    explicacion += `3. Encontrar las raíces (valores de x que hacen que el polinomio sea cero) usando métodos como la división sintética, la fórmula cuadrática, o métodos numéricos.\n`;
    explicacion += `4. Graficar el polinomio para visualizar su comportamiento y raíces.\n`;
    explicacion += `5. Calcular la derivada (para encontrar puntos críticos) y la integral (para el área bajo la curva).\n`;
    explicacion += `\nPara una explicación paso a paso y cálculos avanzados, se requeriría una librería de procesamiento simbólico o numérico más robusta (ej. mathjs, nerdamer).`;

    return explicacion;
}

/**
 * Analiza y resuelve una desigualdad lineal simple, proporcionando una explicación paso a paso.
 * Esta es una implementación simplificada para desigualdades de la forma ax + b < c, ax + b > c, etc.
 * No maneja desigualdades cuadráticas, fraccionarias o más complejas.
 * @param {string} desigualdadString La desigualdad como una cadena de texto (ej. "2x+5 > 10")
 * @returns {string} Una explicación paso a paso generada.
 */
function analizarDesigualdadSimple(desigualdadString) {
    desigualdadString = desigualdadString.toLowerCase().replace(/\s/g, ''); // Limpia espacios y convierte a minúsculas
    let explicacion = `Analizando la desigualdad: ${desigualdadString}\n\n`;

    let operador = '';
    if (desigualdadString.includes('<=')) operador = '<=';
    else if (desigualdadString.includes('>=')) operador = '>=';
    else if (desigualdadString.includes('<')) operador = '<';
    else if (desigualdadString.includes('>')) operador = '>';
    else if (desigualdadString.includes('=')) operador = '='; // Aunque es una igualdad, la tratamos si no hay otra

    if (!operador) {
        return `No se pudo identificar un operador de desigualdad válido en "${desigualdadString}". Asegúrate de usar <, >, <=, >=, o =.`;
    }

    let partes = desigualdadString.split(operador);
    let ladoIzquierdoStr = partes[0];
    let ladoDerechoStr = partes[1];

    explicacion += `Descomponiendo la desigualdad:\n`;
    explicacion += `Lado izquierdo: ${ladoIzquierdoStr}\n`;
    explicacion += `Lado derecho: ${ladoDerechoStr}\n`;
    explicacion += `Operador: ${operador}\n\n`;

    // Intenta parsear el lado izquierdo como ax + b
    let coefX = 0;
    let constanteIzquierda = 0;
    let constanteDerecha = parseFloat(ladoDerechoStr); // Asume que el lado derecho es una constante

    // Expresión regular para encontrar términos con x y constantes
    const termRegex = /([+-]?\d*\.?\d*x)|([+-]?\d+\.?\d*)/g;
    let termsIzquierda = ladoIzquierdoStr.match(termRegex);

    if (termsIzquierda) {
        for (const term of termsIzquierda) {
            if (term.includes('x')) {
                let coefPart = term.split('x')[0];
                if (coefPart === '' || coefPart === '+') coefX += 1;
                else if (coefPart === '-') coefX -= 1;
                else coefX += parseFloat(coefPart);
            } else {
                constanteIzquierda += parseFloat(term);
            }
        }
    } else {
        // Podría ser solo una constante en el lado izquierdo
        if (!isNaN(parseFloat(ladoIzquierdoStr))) {
            constanteIzquierda = parseFloat(ladoIzquierdoStr);
        } else {
            return explicacion + `Error: No se pudo parsear el lado izquierdo de la desigualdad "${ladoIzquierdoStr}".`;
        }
    }

    explicacion += `\nResolviendo paso a paso:\n`;
    explicacion += `1. La desigualdad es: ${desigualdadString}\n`; 

    // Paso 1: Mueve la constante del lado izquierdo al derecho
    if (constanteIzquierda !== 0) {
        explicacion += `2. Restamos ${constanteIzquierda} a ambos lados para aislar el término con 'x':\n`;
        let nuevoLadoDerecho = constanteDerecha - constanteIzquierda;
        explicacion += `   ${coefX === 1 ? 'x' : coefX === -1 ? '-x' : coefX + 'x'} ${operador} ${nuevoLadoDerecho}\n`;
        constanteDerecha = nuevoLadoDerecho;
    } else {
        explicacion += `2. El término constante en el lado izquierdo es cero, no es necesario moverlo.\n`;
    }

    // Paso 2: Divide por el coeficiente de x
    if (coefX !== 0) {
        explicacion += `3. Dividimos ambos lados por ${coefX} para resolver para 'x':\n`;
        let nuevoOperador = operador;
        if (coefX < 0) {
            // ¡Invierte el operador si dividimos por un número negativo!
            if (operador === '<') nuevoOperador = '>';
            else if (operador === '>') nuevoOperador = '<';
            else if (operador === '<=') nuevoOperador = '>=';
            else if (operador === '>=') nuevoOperador = '<=';
            explicacion += `   (¡Atención! Se invierte el signo de la desigualdad porque se divide por un número negativo)\n`;
        }
        let solucionX = constanteDerecha / coefX;
        explicacion += `   x ${nuevoOperador} ${solucionX}\n`;
        explicacion += `\nLa solución de la desigualdad es: x ${nuevoOperador} ${solucionX}\n`;
        
        // Notación de intervalo (simplificada)
        if (nuevoOperador === '<') {
            explicacion += `En notación de intervalo: (-∞, ${solucionX})\n`;
        } else if (nuevoOperador === '<=') {
            explicacion += `En notación de intervalo: (-∞, ${solucionX}]\n`;
        } else if (nuevoOperador === '>') {
            explicacion += `En notación de intervalo: (${solucionX}, +∞)\n`;
        } else if (nuevoOperador === '>=') {
            explicacion += `En notación de intervalo: [${solucionX}, +∞)\n`;
        } else if (nuevoOperador === '=') {
            explicacion += `En notación de intervalo: {${solucionX}} (es una igualdad)\n`;
        }

    } else {
        explicacion += `Error: El coeficiente de 'x' es cero, lo que impide una solución lineal simple para 'x'.\n`;
        // Evalúa si la desigualdad es verdadera o falsa sin x
        if (eval(`${constanteIzquierda} ${operador} ${constanteDerecha}`)) {
            explicacion += `La desigualdad ${constanteIzquierda} ${operador} ${constanteDerecha} es verdadera para cualquier valor de x.\n`;
        } else {
            explicacion += `La desigualdad ${constanteIzquierda} ${operador} ${constanteDerecha} es falsa para cualquier valor de x.\n`;
        }
    }

    explicacion += `\n\nNota: Esta es una resolución para desigualdades lineales simples. Para casos más complejos (cuadráticas, racionales, con valor absoluto), se requiere un análisis más avanzado o una librería matemática simbólica.`;

    return explicacion;
}

/**
 * Analiza una expresión algebraica general y proporciona una explicación básica.
 * Esta función es muy simplificada y solo identifica tipos de términos y operadores.
 * No realiza simplificaciones ni resoluciones complejas.
 * @param {string} expresionString La expresión algebraica como una cadena de texto (ej. "3x + 2y - 7", "a^2 + b^2")
 * @returns {string} Una explicación generada.
 */
function analizarAlgebraGeneral(expresionString) {
    expresionString = expresionString.toLowerCase().replace(/\s/g, ''); // Limpia espacios y convierte a minúsculas
    let explicacion = `Analizando la expresión algebraica: ${expresionString}\n\n`;

    const operadores = ['+', '-', '*', '/', '^'];
    const variables = new Set();
    let terminosIdentificados = [];
    let tiposDeTerminos = {
        'constantes': 0,
        'terminos_con_variable': 0
    };

    // Expresión regular para identificar términos (constantes o términos con variables)
    // Captura:
    // 1. Signo opcional ([+-]?)
    // 2. Coeficiente opcional (\d*\.?\d*)
    // 3. Variables y exponentes (([a-z]\d*(\^\d+)?)?) - permite letras, números después de la letra, y exponentes
    const termRegex = /([+-]?\d*\.?\d*[a-z]\d*(\^\d+)?)|([+-]?\d+\.?\d*)/g;
    const rawTerms = expresionString.match(termRegex);

    if (!rawTerms) {
        return `No se pudo analizar la expresión: ${expresionString}. Asegúrate de que el formato sea correcto (ej. 3x + 2y - 7, a^2 + b^2, 5).`;
    }

    explicacion += `Componentes identificados:\n`;

    for (const rawTerm of rawTerms) {
        let term = rawTerm.trim();
        terminosIdentificados.push(term);

        if (/[a-z]/.test(term)) { // Si el término contiene letras (variables)
            tiposDeTerminos.terminos_con_variable++;
            const varMatch = term.match(/[a-z]\d*/g); // Extrae solo la parte de la variable (ej. 'x', 'y', 'a2')
            if (varMatch) {
                varMatch.forEach(v => variables.add(v));
            }
            explicacion += `- Término con variable: ${term}\n`;
        } else { // Si es una constante
            tiposDeTerminos.constantes++;
            explicacion += `- Constante: ${term}\n`;
        }
    }

    if (variables.size > 0) {
        explicacion += `\nVariables presentes: ${Array.from(variables).join(', ')}\n`;
    } else {
        explicacion += `\nNo se identificaron variables en la expresión.\n`;
    }

    explicacion += `\nOperadores comunes en álgebra:\n`;
    explicacion += `- Suma (+)\n`;
    explicacion += `- Resta (-)\n`;
    explicacion += `- Multiplicación (*)\n`;
    explicacion += `- División (/)\n`;
    explicacion += `- Potenciación (^)\n`;

    explicacion += `\nConceptos clave en álgebra:\n`;
    explicacion += `1.  **Término:** Una parte de una expresión algebraica que puede ser una constante, una variable, o el producto de una constante y una o más variables (ej. 3x, 5, -2y²).\n`;
    explicacion += `2.  **Coeficiente:** El número que multiplica a una variable en un término (ej. en 3x, 3 es el coeficiente).\n`;
    explicacion += `3.  **Variable:** Una letra o símbolo que representa un número desconocido (ej. x, y, a).\n`;
    explicacion += `4.  **Constante:** Un número que no cambia su valor (ej. 5, -7).\n`;
    explicacion += `5.  **Expresión Algebraica:** Una combinación de números, variables y operaciones matemáticas (ej. 3x + 2y - 7).\n`;
    explicacion += `6.  **Ecuación:** Una igualdad entre dos expresiones algebraicas (ej. 3x + 5 = 11).\n`;
    explicacion += `7.  **Inecuación/Desigualdad:** Una relación que establece que dos expresiones no son iguales (ej. 2x > 8).\n`;
    explicacion += `8.  **Polinomio:** Una expresión algebraica que consiste en la suma de uno o más términos, cada uno de los cuales es el producto de una constante y una o más variables elevadas a potencias enteras no negativas (ej. x² + 3x - 1).\n`;

    explicacion += `\nEsta herramienta proporciona una explicación conceptual. Para simplificar, resolver o graficar expresiones algebraicas complejas, se recomienda el uso de software matemático especializado o librerías de álgebra simbólica.`;

    return explicacion;
}


// --- Rutas ---

// Ruta de la página de inicio (la de la imagen)
app.get('/', (req, res) => {
    res.render('index', { titulo: 'Inicio', isDarkMode: res.locals.isDarkMode });
});

// --- Rutas de Polinomios ---

// Ruta para mostrar el formulario de inserción de polinomios
app.get('/insertar-polinomios', (req, res) => {
    // La ruta para form_polinomios.ejs ya existe y está aquí.
    res.render('form_polinomios', { titulo: 'Insertar Polinomio', isDarkMode: res.locals.isDarkMode });
});

// Ruta para manejar el envío del formulario de polinomios
app.post('/explicar-polinomios', (req, res) => {
    const polinomioInput = req.body.polinomio;
    console.log('Polinomio recibido:', polinomioInput);

    // ====================================================================
    // *** AHORA USAMOS LA FUNCIÓN DE LÓGICA MATEMÁTICA ***
    // ====================================================================
    const explicacionGenerada = analizarPolinomioSimple(polinomioInput);

    res.render('polinomios', {
        titulo: 'Explicación de Polinomios',
        polinomio: polinomioInput,
        explicacion: explicacionGenerada, // Pasa la explicación generada dinámicamente
        isDarkMode: res.locals.isDarkMode
    });
});

// --- Rutas de Desigualdades ---

// Ruta para mostrar el formulario de inserción de desigualdades
app.get('/insertar-desigualdades', (req, res) => {
    res.render('form_desigualdades_ejemplos', { titulo: 'Insertar Desigualdad', isDarkMode: res.locals.isDarkMode });
});

app.post('/procesar-desigualdad', (req, res) => {
    const desigualdadInput = req.body.desigualdad;
    const tipoAccion = req.body.accion;

    console.log('Desigualdad recibida:', desigualdadInput);
    console.log('Tipo de acción:', tipoAccion);

    let explicacionDesigualdad = '';

    // ====================================================================
    // *** AHORA USAMOS LA FUNCIÓN DE LÓGICA MATEMÁTICA PARA DESIGUALDADES ***
    // ====================================================================
    explicacionDesigualdad = analizarDesigualdadSimple(desigualdadInput);


    // Consolida para usar 'desigualdad.ejs' para ambos tipos de acción
    res.render('desigualdad', {
        titulo: (tipoAccion === 'ejemplo' ? 'Ejemplo de Desigualdad' : 'Explorando Desigualdades'),
        desigualdad: desigualdadInput,
        resolucion: explicacionDesigualdad, // Usa 'resolucion' para la explicación
        analisis: explicacionDesigualdad, // También pasa como 'analisis' en caso de que la vista lo use
        isDarkMode: res.locals.isDarkMode
    });
});

// --- Rutas de Álgebra General ---

// NUEVA RUTA: Página de inicio de Álgebra General
app.get('/algebra-general-home', (req, res) => {
    res.render('algebra_general_home', {
        titulo: 'Álgebra General',
        isDarkMode: res.locals.isDarkMode
    });
});

// Ruta para mostrar el formulario de inserción de expresiones de álgebra general
app.get('/insertar-algebra-general', (req, res) => {
    res.render('form_algebra_general', { titulo: 'Insertar Álgebra General', isDarkMode: res.locals.isDarkMode });
});

app.post('/explicar-algebra-general', (req, res) => {
    const expresionInput = req.body.expresion;
    console.log('Expresión algebraica recibida:', expresionInput);

    // ====================================================================
    // *** AHORA USAMOS LA FUNCIÓN DE LÓGICA MATEMÁTICA PARA ÁLGEBRA GENERAL ***
    // ====================================================================
    const explicacionGenerada = analizarAlgebraGeneral(expresionInput);

    res.render('algebra_general', {
        titulo: 'Explicación de Álgebra General',
        expresion: expresionInput,
        explicacion: explicacionGenerada, // Pasa la explicación generada dinámicamente
        isDarkMode: res.locals.isDarkMode
    });
});

// --- Ruta de Calculadora Gráfica ---
app.get('/calculadora-grafica', (req, res) => {
    res.render('calculadora_grafica', { titulo: 'Calculadora Gráfica', isDarkMode: res.locals.isDarkMode });
});

// --- Rutas de Chatbot Matemático ---
app.get('/chatbot-matematico', (req, res) => {
    res.render('chatbot_matematico', { titulo: 'Chatbot Matemático', isDarkMode: res.locals.isDarkMode });
});

// --- RUTA PARA LA PÁGINA "ACERCA DE MATHMASTER" ---
app.get('/about-mathmaster', (req, res) => {
    res.render('about_mathmaster', { titulo: 'Acerca de MathMaster', isDarkMode: res.locals.isDarkMode });
});


// --- NUEVA RUTA PARA EL CHATBOT (API) ---
app.post('/api/chat', async (req, res) => { // Usamos '/api/chat' para ser más explícitos con las APIs
  try {
    // Obtenemos el mensaje y el historial del cuerpo de la solicitud
    const { message, chat_history } = req.body;

    // Verificamos que el mensaje exista
    if (!message) {
      return res.status(400).json({ error: 'El cuerpo de la solicitud debe contener un "message"' });
    }

    console.log('Mensaje recibido para el chatbot:', message);

    // Formateamos el historial de chat para la API de OpenAI/OpenRouter
    // Tu frontend React envía { role: 'user/model', parts: [{ text: '...' }] }
    // La API de OpenAI/OpenRouter espera { role: 'user/assistant', content: '...' }
    const messages = [];
    if (chat_history && Array.isArray(chat_history)) {
        chat_history.forEach(msg => {
            if (msg.role && msg.parts && msg.parts.length > 0 && msg.parts[0].text) {
                const role = msg.role === 'bot' ? 'assistant' : msg.role; // Mapea 'bot' a 'assistant' para la API de OpenRouter
                messages.push({ role: role, content: msg.parts[0].text });
            }
        });
    }
    // Añadimos el mensaje actual del usuario
    messages.push({ role: 'user', content: message });


    // Hacemos la llamada a la API de OpenRouter
    const completion = await openai.chat.completions.create({
      model: 'deepseek-ai/deepseek-r1-2b-base.free', // Especifica el modelo gratuito de DeepSeek
      messages: messages, // Usamos el historial de mensajes formateado
    });

    // Enviamos la respuesta del modelo de vuelta al cliente
    res.json(completion.choices[0].message);

  } catch (error) {
    console.error('Error al contactar la API de OpenRouter:', error);
    res.status(500).json({ error: 'No se pudo procesar la solicitud del chatbot' });
  }
});


// --- INICIAR EL SERVIDOR ---
app.listen(port, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${port}`);
  // Una pequeña verificación para saber si la clave de API se cargó
  if (!process.env.OPENROUTER_API_KEY) { // Verifica OPENROUTER_API_KEY, no DEEPSEEK_API_KEY
      console.warn('ADVERTENCIA: La variable de entorno OPENROUTER_API_KEY no está configurada. El chatbot no funcionará.');
  }
});