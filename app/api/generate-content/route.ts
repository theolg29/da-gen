import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, Part } from '@google/generative-ai';

export async function POST(request: NextRequest) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: 'GEMINI_API_KEY non configurée dans .env.local' }, { status: 500 });
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  try {
    const formData = await request.formData();
    const chips = JSON.parse(formData.get('chips') as string || '[]') as string[];
    const siteData = JSON.parse(formData.get('siteData') as string || '{}');
    const clientBrief = (formData.get('clientBrief') as string || '').trim();
    const files = formData.getAll('files') as File[];

    // Build parts array for Gemini (text + optional inline PDF)
    const parts: Part[] = [];

    // Text context from uploaded files
    let fileContext = '';
    const pdfParts: Part[] = [];

    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'txt' || ext === 'md') {
        const text = await file.text();
        fileContext += `\n\n--- ${file.name} ---\n${text}`;
      } else if (ext === 'pdf') {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        pdfParts.push({
          inlineData: { mimeType: 'application/pdf', data: base64 }
        });
      }
    }

    const chipsText = chips.length > 0 ? chips.join(' · ') : 'Non précisé';

    const prompt = `Tu es un expert en marketing digital et rédaction web pour une agence digitale française.
Génère du contenu professionnel pour un cas client d'agence.

## Infos du site analysé
- Nom / Titre : ${siteData.title || siteData.domain}
- URL : ${siteData.siteUrl || ''}
- Domaine : ${siteData.domain || ''}

## Type de projet
${chipsText}

${clientBrief ? `## Brief client (fourni par l'agence)\n${clientBrief}` : ''}
${fileContext ? `## Documents complémentaires\n${fileContext}` : ''}
${pdfParts.length > 0 ? `(${pdfParts.length} fichier(s) PDF joint(s) ci-dessous)` : ''}

## Instructions
Génère du contenu en JSON **strictement valide**, sans markdown, sans texte avant ou après :

{
  "caseStudy": {
    "title": "Titre accrocheur du cas client (ex: 'Studio Baya – Une identité digitale au service du bien-être')",
    "tagline": "Phrase d'accroche courte, percutante (15-20 mots)",
    "intro": "Présentation du client et de son activité (2-3 phrases, ton professionnel et évocateur)",
    "challenge": "Les besoins et défis du client (2-3 phrases, met en avant le problème à résoudre)",
    "solution": "Ce que l'agence a mis en place (2-3 phrases, focus approche créative et technique)",
    "results": "Les résultats et bénéfices obtenus (2-3 phrases, inclure métriques hypothétiques crédibles si aucune donnée réelle)",
    "services": ["Service 1", "Service 2", "Service 3"],
    "platform": "Technologie / CMS principal utilisé"
  },
  "socialPost": {
    "caption": "Post Instagram/LinkedIn complet. Sépare chaque partie par une ligne vide (\\n\\n). Structure : 1) Titre accrocheur en majuscules sur la première ligne, style '✨ NOUVELLE RÉALISATION — [Nom du client]' ou variante créative selon le type de projet (pas toujours 'nouvelle réalisation', sois inventif : 'ON EST FIERS DE VOUS PRÉSENTER...', 'UN PROJET QUI NOUS TIENT À CŒUR...', etc.) + ligne vide + 2) accroche forte (1 ligne) + ligne vide + 3) contexte du projet (2-3 lignes) + ligne vide + 4) ce qu'on a fait (2-3 lignes) + ligne vide + 5) lien vers le site réalisé : ${siteData.siteUrl || siteData.domain} + ligne vide + 6) résultat/fierté (1-2 lignes) + ligne vide + 7) 'Vous aussi vous souhaitez obtenir votre site ? 👉 teaps.fr'. Utilise des emojis avec modération, parle à la première personne du pluriel. Ton : professionnel mais humain.",
    "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5", "hashtag6"]
  }
}`;

    parts.push({ text: prompt });
    // Add PDF files after the text prompt
    parts.push(...pdfParts);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(parts);
    const text = result.response.text();

    // Strip potential markdown code blocks
    const clean = text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim();
    const content = JSON.parse(clean);

    return NextResponse.json(content);
  } catch (err) {
    console.error('[generate-content]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erreur lors de la génération.' },
      { status: 500 }
    );
  }
}
