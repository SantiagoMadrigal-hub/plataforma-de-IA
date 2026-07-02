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

  async save(prompt, content, format) {
    const firstLine =
      content.split("\n").find((l) => l.trim().length > 0) || "";
    const titleFromContent = firstLine.replace(/^#+\s*/, "").trim();
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
      blog: `# ${topic}\n\n## Introducción\n\n${topic} es un tema que ha cobrado gran relevancia en los últimos tiempos. En este artículo exploraremos sus aspectos fundamentales y cómo puede aplicarse en la vida cotidiana.\n\n## Desarrollo\n\nPara comprender a fondo ${topic.toLowerCase()}, es importante analizarlo desde diferentes perspectivas. Los expertos señalan que su impacto va más allá de lo que imaginamos.\n\n### Puntos clave:\n\n1. **Fundamentos**: Entender las bases de ${topic.toLowerCase()} es el primer paso.\n2. **Aplicación práctica**: La teoría cobra sentido cuando la llevamos a la acción.\n3. **Beneficios**: Los resultados transforman la manera en que nos relacionamos con el mundo.\n\n## Conclusión\n\n${topic} no es solo una tendencia pasajera, sino una herramienta poderosa para el crecimiento personal y profesional. Te invitamos a seguir explorando este fascinante tema.\n\n---\n*Artículo generado con tono ${toneStr} — Formato: ${label}*`,

      instagram: `📌 **${topic}**\n\n✨ ¿Sabías que esto puede cambiar tu forma de ver las cosas?\n\n👇 Te comparto 3 puntos clave:\n\n1️⃣ Empieza hoy — no esperes el momento perfecto para explorar ${topic.toLowerCase()}\n2️⃣ Sé constante — los resultados llegan con disciplina y dedicación\n3️⃣ Comparte tu experiencia — inspira a otros con tu aprendizaje\n\n💬 Cuéntame en los comentarios: ¿qué opinas sobre ${topic.toLowerCase()}?\n\n❤️ Guarda este post para leerlo después\n🔄 Comparte con alguien que necesite leerlo\n\n#${topic.replace(/\\s+/g, "")} #Crecimiento #Bienestar`,

      youtube: `# GUIÓN: ${topic}\n\n## INTRO (0:00 - 0:35)\n\n🎬 **Host**: "Hola a todos y bienvenidos a un nuevo video. Hoy vamos a hablar de un tema fascinante: ${topic.toLowerCase()}. Antes de empezar, dale like y suscríbete."\n\n## DESARROLLO (0:35 - 5:00)\n\n🎬 **Host**: "Para entender ${topic.toLowerCase()}, primero tenemos que preguntarnos: ¿por qué es tan importante en nuestra vida diaria?"\n\n[Transición visual]\n\n🎬 **Host**: "Vamos a dividirlo en tres partes clave. Primero, los fundamentos. Segundo, cómo aplicarlo. Tercero, los beneficios a largo plazo."\n\n[B-Roll relevante]\n\n🎬 **Host**: "La clave está en la constancia. No se trata de hacerlo perfecto, sino de hacerlo parte de tu rutina."\n\n## CIERRE (5:00 - 6:00)\n\n🎬 **Host**: "Espero que este video te haya sido útil. Si quieres más contenido sobre ${topic.toLowerCase()}, déjalo en los comentarios. Nos vemos pronto."\n\n---\n*Tono: ${toneStr} — Formato: ${label}*`,

      email: `**Asunto:** Descubre todo sobre ${topic}\n\n**Para:** Contacto\n\nEstimado/a lector/a,\n\nEspero que este mensaje te encuentre bien. Hoy quiero compartir contigo información valiosa acerca de **${topic}**, un tema que considero de gran interés.\n\n---\n\n### ¿Por qué es importante?\n\n${topic} está cobrando cada vez más relevancia. Entender sus implicaciones puede marcar la diferencia en tu día a día.\n\n### ¿Qué puedes hacer?\n\n1. Infórmate a fondo sobre ${topic.toLowerCase()}\n2. Aplica los conocimientos adquiridos\n3. Comparte esta información con tu red\n\n---\n\nSi tienes preguntas, responde a este correo. Estaré encantado de ayudarte.\n\nSaludos cordiales,\n\n**El equipo de Lexora**\n\n---\n*Tono: ${toneStr} — Formato: ${label}*`,

      seo: `# Estrategia SEO: ${topic}\n\n## Palabra clave principal\n\`${topic.toLowerCase()}\`\n\n## Intención de búsqueda\nInformativa / Transaccional\n\n## Estructura recomendada\n\n### H1: ${topic}\n### H2: ¿Qué es ${topic.toLowerCase()}?\n### H2: Beneficios clave\n### H3: Cómo implementarlo paso a paso\n### H2: Preguntas frecuentes\n\n## Meta description\nDescubre todo sobre ${topic.toLowerCase()}: definición, beneficios, ejemplos prácticos y guía paso a paso.\n\n## Keywords secundarias\n- ${topic.toLowerCase()} para principiantes\n- beneficios de ${topic.toLowerCase()}\n- ejemplos de ${topic.toLowerCase()}\n- guía completa de ${topic.toLowerCase()}\n\n## Recomendaciones\n- Extensión: 1500-2000 palabras\n- Incluir 3-5 imágenes optimizadas\n- Enlazar a fuentes autoritativas\n- Optimizar para featured snippets\n\n---\n*Tono: ${toneStr} — Formato: ${label}*`,
    };

    return (
      templates[format] ||
      `[CONTENIDO SIMULADO]\n\nTema: ${topic}\nTono: ${toneStr}\nFormato: ${label}\n\nEste contenido de prueba demuestra el flujo de la aplicación. En producción, aquí se mostraría el resultado real de la IA.\n\n¡La arquitectura está lista para conectar con OpenAI, Claude o Gemini cuando tengas una API key válida!`
    );
  }

  async callProxy(prompt, tone, format) {
    const response = await this._fetchWithTimeout(AI_PROXY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, tone, format }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Proxy de IA error (${response.status}): ${err}`);
    }

    const data = await response.json();
    return data.content;
  }
}
