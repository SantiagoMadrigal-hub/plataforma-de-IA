const FORMAT_LABELS = {
  instagram: "Post para Instagram",
  blog: "Artículo de blog",
  youtube: "Guion de YouTube",
  email: "Email",
  seo: "Contenido SEO",
};
const TONE_DESC = {
  profesional: "profesional y corporativo",
  divertido: "divertido y cercano",
  formal: "formal y serio",
  creativo: "creativo e innovador",
};

const API_TIMEOUT_MS = 15_000;

// El generador ya no llama a Groq/OpenAI directamente desde el navegador
// (eso exponía la API key a quien viera el código fuente). En su lugar,
// le pide el contenido a nuestra propia función serverless, que es la
// única que conoce la key real (guardada como variable de entorno del
// servidor). Ver /api/generate.js.
import { api, getToken } from './http.js';

const AI_PROXY_ENDPOINT = "/api/generate";

export class AIService {
  constructor(settingsRepository, documentService) {
    // settingsRepository se mantiene por compatibilidad con quien
    // instancia este servicio (main.js), aunque ya no se usa para
    // leer API keys: esas ya no viven en el cliente.
    this.settingsRepo = settingsRepository;
    this.docService = documentService;
  }

  async generate(prompt, tone, format) {
    try {
      return await this.callProxy(prompt, tone, format);
    } catch (e) {
      console.warn(
        "El servicio de IA no está disponible, usando contenido de demostración:",
        e.message,
      );
      return this.mockGenerate(prompt, tone, format);
    }
  }

  async generateStream(prompt, tone, format, callbacks) {
    const { onChunk, onDone, onError } = callbacks;
    const token = getToken();

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt, tone, format, stream: true }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error?.message || `Error ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (!payload) continue;
          try {
            const data = JSON.parse(payload);
            if (data.type === "chunk") {
              onChunk(data.text);
            } else if (data.type === "done") {
              onDone(data);
            } else if (data.type === "error") {
              onError(new Error(data.message));
            }
          } catch {
            // skip
          }
        }
      }
    } catch (err) {
      console.warn("Streaming no disponible, usando metodo alternativo:", err.message);
      try {
        const content = await this.callProxy(prompt, tone, format);
        onChunk(content);
        onDone({ content, provider: "fallback", model: "fallback" });
      } catch (e) {
        onError(e);
      }
    }
  }

  async save(prompt, content, format) {
    const firstLine =
      content.split("\n").find((l) => l.trim().length > 0) || "";
    const titleFromContent = firstLine.replace(/^[#*\s]+/, "").replace(/[*\s]+$/, "").replace(/\*+/g, "").trim();
    const title =
      titleFromContent.length > 0
        ? titleFromContent.substring(0, 80)
        : prompt.length > 50
          ? prompt.substring(0, 50) + "…"
          : prompt;

    return this.docService.create({ title, type: format, content });
  }

  async _fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err) {
      if (err.name === "AbortError") {
        throw new Error(
          `La solicitud tardó más de ${API_TIMEOUT_MS / 1000}s y fue cancelada.`,
        );
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async mockGenerate(prompt, tone, format) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const topic =
      prompt
        .replace(
          /^(dame|crea|escribe|genera|haz|quiero|necesito|realiza|elabora|redacta|prepara)\s*(un|una|unos|unas|me|te|le|nos)?\s*(guion|guía|artículo|post|contenido|texto|documento|email|correo|publicación|lista|resumen|informe)?\s*/i,
          "",
        )
        .replace(/^(sobre|acerca de|de|para|acerca)\s*/i, "")
        .trim() || prompt.trim();
    const label = FORMAT_LABELS[format] || format;
    const toneStr = TONE_DESC[tone] || tone;

    const templates = {
      blog: `# ${topic}\n\n## Introducción\n\n${topic} se ha convertido en un tema central dentro del panorama actual. Cada vez más personas y organizaciones buscan comprender su alcance y las oportunidades que ofrece. En este articulo analizaremos en profundidad sus aspectos mas relevantes.\n\n## Desarrollo\n\nPara abordar ${topic.toLowerCase()} de manera integral, es necesario examinarlo desde distintos angulos. Lo que a simple vista parece sencillo revela una complejidad que merece atencion.\n\n### Puntos clave:\n\n1. **Fundamentos**: Comprender las bases de ${topic.toLowerCase()} resulta esencial para cualquier persona que desee adentrarse en el tema.\n2. **Aplicacion practica**: La teoria cobra verdadero valor cuando se traduce en acciones concretas y resultados medibles.\n3. **Impacto**: Los efectos de ${topic.toLowerCase()} se extienden a multiples areas, transformando la manera en que entendemos el entorno.\n\n### Analisis en profundidad\n\nUno de los aspectos mas interesantes de ${topic.toLowerCase()} es su capacidad para adaptarse a contextos muy diversos. No se trata de un concepto estatico, sino de una disciplina en constante evolucion que exige actualizacion permanente.\n\nLos expertos coinciden en que la clave del exito reside en la combinacion de teoria y practica. No basta con conocer los principios: es necesario aplicarlos de forma sistematica y evaluar los resultados obtenidos.\n\n## Conclusion\n\n${topic} representa una oportunidad unica para quienes decidan explorarlo a fondo. La invitacion esta abierta a seguir profundizando y a compartir los hallazgos con la comunidad.\n\n---\n*Articulo generado con tono ${toneStr} - Formato: ${label}*`,

      instagram: `**${topic}**\n\nTres claves para entenderlo y aplicarlo desde hoy.\n\n**1. Informate**\nEl primer paso es conocer los fundamentos. Dedica tiempo a investigar fuentes confiables y a formarte una opinion solida.\n\n**2. Actua**\nEl conocimiento sin accion no produce resultados. Identifica areas concretas donde puedas aplicar lo aprendido y ponte en marcha.\n\n**3. Comparte**\nCompartir lo que sabes con otros no solo ayuda a tu red, sino que refuerza tu propio aprendizaje.\n\n¿Que opinion te merece ${topic.toLowerCase()}? Escribelo en los comentarios. La conversacion enriquece a todos.\n\nGuarda esta publicacion para consultarla cuando lo necesites y compartela con alguien a quien pueda resultarle util.\n\n#${topic.replace(/\s+/g, "")} #Aprendizaje #Desarrollo`,

      youtube: `# GUION: ${topic}\n\n## INTRO (0:00 - 0:40)\n\n**Host:** "Bienvenidos a un nuevo video. Hoy vamos a explorar un tema que genera mucho interes: ${topic.toLowerCase()}. Antes de comenzar, te invito a suscribirte y activar la campanita para no perderte ningun contenido."\n\n## CONTEXTO (0:40 - 1:30)\n\n**Host:** "Para entender ${topic.toLowerCase()}, primero debemos preguntarnos: por que es relevante ahora? La respuesta tiene que ver con los cambios que estamos viendo en el panorama actual."\n\n[Grafico explicativo o toma de apoyo]\n\n## DESARROLLO (1:30 - 5:00)\n\n**Host:** "Vamos a estructurarlo en tres bloques. Primero, los fundamentos teoricos. Segundo, la aplicacion practica. Tercero, los resultados esperados."\n\n[B-Roll del tema]\n\n**Host:** "El primer bloque nos situa en el contexto necesario. Sin una base solida, cualquier intento de aplicar estos conceptos corre el riesgo de quedarse superficial."\n\n**Host:** "En el segundo bloque veremos como llevar la teoria a la practica. Aqui es donde realmente ocurre la transformacion."\n\n**Host:** "Finalmente, analizaremos los resultados. Que podemos esperar? Como medir el exito?"\n\n## CIERRE (5:00 - 6:00)\n\n**Host:** "Espero que este analisis te haya sido de utilidad. Si te interesa el tema, dejamelo en los comentarios y preparare un video mas detallado. Nos vemos en el siguiente."\n\n---\n*Tono: ${toneStr} - Formato: ${label}*`,

      email: `**Asunto:** ${topic}\n\nHola,\n\nEspero que este mensaje te encuentre bien. Me pongo en contacto contigo para compartirte informacion de valor sobre **${topic}**, un tema que considero puede ser de gran interes para ti.\n\n**?Por que es relevante?**\n\n${topic} esta ganando protagonismo en distintos ambitos. Comprender sus implicaciones puede abrirte nuevas perspectivas y oportunidades que quizas no habias considerado.\n\n**?Que puedes hacer?**\n\n1. Infomarte a fondo sobre ${topic.toLowerCase()} y sus aplicaciones.\n2. Identificar areas de tu actividad donde puedas integrar estos conceptos.\n3. Compartir esta informacion con tu equipo o red de contactos.\n\nSi tienes alguna pregunta o quieres profundizar en algun aspecto, no dudes en responder a este correo. Estare encantado de ayudarte.\n\nRecibe un cordial saludo,\n\n**El equipo de ContentFlow**\n\n---\n*Tono: ${toneStr} - Formato: ${label}*`,

      seo: `# Estrategia SEO: ${topic}\n\n## Palabra clave principal\n\n\`${topic.toLowerCase()}\`\n\n## Intencion de busqueda\n\nInformativa / Transaccional\n\n## Estructura recomendada\n\n### H1: ${topic}\n### H2: Que es ${topic.toLowerCase()}?\n### H2: Beneficios y ventajas\n### H3: Como empezar paso a paso\n### H2: Casos de uso\n### H2: Preguntas frecuentes\n\n## Meta description\n\nDescubre todo sobre ${topic.toLowerCase()}: definicion, beneficios, casos de uso y guia practica para empezar hoy mismo.\n\n## Keywords secundarias\n\n- ${topic.toLowerCase()} para principiantes\n- beneficios de ${topic.toLowerCase()}\n- ejemplos de ${topic.toLowerCase()}\n- guia de ${topic.toLowerCase()}\n- ${topic.toLowerCase()} paso a paso\n\n## Recomendaciones tecnicas\n\n- Extension recomendada: 1500-2000 palabras\n- Incluir 3-5 imagenes optimizadas con alt text\n- Enlazar a fuentes autoritativas del sector\n- Optimizar para featured snippets con listas y definiciones claras\n- Incluir llamado a la accion al final del contenido\n\n---\n*Tono: ${toneStr} - Formato: ${label}*`,
    };

    return (
      templates[format] ||
      `[CONTENIDO SIMULADO]\n\nTema: ${topic}\nTono: ${toneStr}\nFormato: ${label}\n\nEste contenido de prueba demuestra el flujo de la aplicación. En producción, aquí se mostraría el resultado real de la IA.\n\n¡La arquitectura está lista para conectar con OpenAI, Claude o Gemini cuando tengas una API key válida!`
    );
  }

  async callProxy(prompt, tone, format) {
    const data = await api('POST', AI_PROXY_ENDPOINT, { prompt, tone, format });
    return data.content;
  }
}
