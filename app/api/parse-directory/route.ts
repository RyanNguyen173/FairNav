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

    const instruction = file
      ? 'Extract every exhibitor/company and every booth number listed for it from the attached directory document, exactly as printed.'
      : rawText.trim()
        ? `Extract every company and every booth number listed for it from this list:\n${rawText}`
        : 'No directory was provided. Invent a realistic set of 8-10 companies (with plausible booth numbers) that would attend a general career fair.'

    const prompt = `${instruction}\n\nIf a company has more than one booth (e.g. "12, 14" in one cell, or the same company on two separate rows), return one entry per booth number rather than combining or dropping any. Return each entry's company name and booth number (empty string if no booth number is given or known).`

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
