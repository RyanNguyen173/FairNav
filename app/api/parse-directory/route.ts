import { Type, createPartFromBase64, createUserContent } from '@google/genai'
import type { NextRequest } from 'next/server'
import { MODEL, generateWithRetry, withGeminiHandler } from '../../../src/lib/gemini'

export const maxDuration = 60

interface ParseDirectoryPayload {
  rawText: string
  file: { mimeType: string; dataBase64: string } | null
}

export async function POST(request: NextRequest) {
  return withGeminiHandler(request, async (ai, payload) => {
    const { rawText, file } = payload as ParseDirectoryPayload

    // The caller is expected to gate this on real input existing - never
    // invent exhibitors from nothing. Cheap client-side guard, not just a
    // trust exercise: skips the API call entirely rather than relying on
    // the model to refuse a request for fabricated data.
    if (!file && !rawText.trim()) {
      return { booths: [] }
    }

    const instruction = file
      ? 'Extract every exhibitor/company and every booth number listed for it from the attached directory document, exactly as printed.'
      : `Extract every company and every booth number listed for it from this list:\n${rawText}`

    const prompt = `${instruction}\n\nIf a company has more than one booth (e.g. "12, 14" in one cell, or the same company on two separate rows), return one entry per booth number rather than combining or dropping any. Return each entry's company name and booth number (empty string if no booth number is given or known). Only return companies that actually appear in the source - never invent or guess at exhibitors that aren't there.`

    const response = await generateWithRetry(ai, {
      model: MODEL,
      contents: file
        ? createUserContent([prompt, createPartFromBase64(file.dataBase64, file.mimeType || 'application/pdf')])
        : prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            booths: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  boothNumber: { type: Type.STRING },
                  companyName: { type: Type.STRING },
                },
                required: ['boothNumber', 'companyName'],
              },
            },
          },
          required: ['booths'],
        },
      },
    })

    return JSON.parse(response.text ?? '{"booths":[]}')
  })
}
