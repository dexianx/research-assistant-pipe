"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { pipe, type VisionEvent } from "@screenpipe/browser"
import { createGroq } from "@ai-sdk/groq"
import { generateText } from "ai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Languages, Play, Pause, Globe2, HelpCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

// Initialize Groq client
const groq = createGroq({
  apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
})

interface LanguageContext {
  sourceLang: string | null
  targetLang: string | null
  platform: string | null
  mode: "translation" | "learning" | "practice" | null
}

interface Suggestion {
  id: string
  text: string
  timestamp: Date
  type: "auto" | "user-requested"
}

// Enhanced language patterns
const LANGUAGE_PATTERNS: Record<string, RegExp[]> = {
  english: [
    /\b(the|a|an|is|are|was|were|have|has|had|will|would|could|should|may|might|must|can)\b/i,
    /\b(I|you|he|she|it|we|they|them|his|her|its|our|their)\b/i,
  ],
  french: [
    /\b(le|la|les|un|une|des|est|sont|était|étaient|a|ont|avait|avaient|sera|seront|pourrait|pourraient|doit|peuvent)\b/i,
    /\b(je|tu|il|elle|nous|vous|ils|elles|son|sa|ses|notre|votre|leur|leurs)\b/i,
    /\b(à|être|avoir|faire|dire|aller|voir|savoir|pouvoir|falloir|valoir)\b/i,
  ],
  spanish: [
    /\b(el|la|los|las|un|una|unos|unas|es|son|era|eran|ha|han|había|habían|será|serán|podría|podrían|debe|pueden)\b/i,
    /\b(yo|tú|él|ella|nosotros|vosotros|ellos|ellas|su|sus|nuestro|vuestra|su)\b/i,
    /\b(ser|estar|haber|tener|hacer|ir|venir|decir|poder|querer)\b/i,
  ],
  german: [
    /\b(der|die|das|ein|eine|ist|sind|war|waren|hat|haben|hatte|hatten|wird|werden|könnte|könnten|muss|können)\b/i,
    /\b(ich|du|er|sie|es|wir|ihr|sie|sein|ihr|unser|euer|ihr)\b/i,
    /\b(sein|haben|werden|können|müssen|sollen|wollen|dürfen|mögen)\b/i,
  ],
  italian: [
    /\b(il|lo|la|i|gli|le|un|uno|una|è|sono|era|erano|ha|hanno|aveva|avevano|sarà|saranno|potrebbe|potrebbero|deve|possono)\b/i,
    /\b(io|tu|lui|lei|noi|voi|loro|suo|sua|suoi|sue|nostro|vostro|loro)\b/i,
    /\b(essere|avere|fare|dire|andare|venire|volere|dovere|potere|sapere)\b/i,
  ],
  portuguese: [
    /\b(o|a|os|as|um|uma|uns|umas|é|são|era|eram|tem|têm|tinha|tinham|será|serão|poderia|poderiam|deve|podem)\b/i,
    /\b(eu|tu|ele|ela|nós|vós|eles|elas|seu|sua|seus|suas|nosso|vosso|seu)\b/i,
    /\b(ser|estar|ter|haver|fazer|ir|vir|dizer|poder|querer)\b/i,
  ],
  russian: [
    /\b(и|в|не|на|я|быть|он|с|что|а|по|это|она|этот|к|но|они|мы|как|из|у|который|то|за|свой|что|весь|год|от|так|о|для|ты|же|все|тот|мочь|вы|человек|такой|его|сказать|только|или|ещё|бы|себя|один|как|уже|до|время|если|сам|когда|другой|вот|говорить|наш|мой|знать|стать|при|чтобы|дело|жизнь|кто|первый|очень|два|день|её|новый|рука|даже|во|со|раз|где|там|под|можно|ну|какой|после|их|работа|без|самый|потом|надо|хотеть|ли|слово|идти|большой|должен|место|иметь|ничто)\b/i,
  ],
  japanese: [
    /\b(は|の|に|を|が|と|で|た|て|も|な|ある|いる|れる|この|その|あの|どの|こと|もの|ない|よう|する|から|まで|へ|や|ながら|による|により|について|として|において|および|または|ただし|および|ならびに|かつ|または|すなわち|あるいは|もしくは|ただし|なお|および|ならびに|かつ|または|すなわち|あるいは|もしくは)\b/i,
  ],
  chinese: [
    /\b(的|是|不|了|在|人|有|我|他|这|中|大|来|上|国|个|到|说|们|为|子|和|你|地|出|道|也|时|年|得|就|那|要|下|以|生|会|自|着|去|之|过|家|学|对|可|她|里|后|小|么|心|多|天|而|能|好|都|然|没|日|于|起|还|发|成|事|只|作|当|想|看|文|无|开|手|十|用|主|行|方|又|如|前|所|本|见|经|头|面|公|同|三|已|老|从|动|两|长|知|民|但|并|间|次|使|身|者|被|高|己|山|千|世|些|果|最|立|新|话|及|部|其|月|工|几|城|机|东|门|此|比|百|便|王|名|今|新|我们|你们|他们|它们)\b/i,
  ],
  korean: [
    /\b(이|그|저|어느|무슨|웬|한|두|세|네|마른|같은|이런|그런|저런|무른|어떤|아무|every|각|매|한|달|제|뿐|등|간|내|외|겸|말|끼리|마다|만|만큼|밖에|부터|뿐|서|에|께|에게|와|과|의|이|이나|이나마|이든|이든지|이라도|인즉|조차|처럼|하고|보다|만큼|같이|도|만|서|야|나|이나|든|는|도|만|서)\b/i,
  ],
  arabic: [
    /\b(و|في|من|إلى|عن|على|أن|مع|هذا|أو|التي|قال|كان|لا|المتحدة|هذه|وقال|وكان|نظام|فقد|كل|اما|يوم|فى|غير|بن|بما|اكثر|الا|الذي|الذى|الان|وقالت|وكانت|للامم|فيه|كلم|لكن|وفي|وقف|ولا|نفسه|لقاء|مقابل|هناك|وقد|اكد|الذين|بها|اليوم|الى|يكون|به|علما|صفر|بشكل|قبل|حيث|اكدت|الاول|الثاني|الثالث|الرابع|الخامس|السادس|بعد|حوالى|الذى|جميع|الماضي|الوقت|المقبل|اليها|ـ|ف|و|و6|قوة|كما|ولم|ومن|وهو|وهي|جهة|حتى|اي|يمكن|بهذا|لدى|الى|الي|الذي|الذى)\b/i,
  ],
  hindi: [
    /\b(का|के|की|एक|में|है|यह|और|से|हैं|को|पर|इस|होता|कि|जो|कर|मे|गया|करने|किया|लिये|अपने|न|हो|इसके|था|द्वारा|हुआ|तो|ही|हुई|या|एवं|दिया|हुए|भी|सकते|किसी|ये|इसे|पे|उस|सभी|होने|हुये|कुछ|अभी|कोई|करते|इसी|उनके|थे|दो|वे|वह|करता|उनकी|उस|आदि|कुल|एस|रहा|इसका|संभव|इसकी|सकता|रखें|अपनी|उनका|इसमें|जब|होती|तब|हुये|कभी|ना|इन्हें|उन्हें|अथवा|व|न|अंदर|इत्यादि|इन|कर|करना|इनके|इनका|इनकी|उनको|उन्हीं|उनके|उनका|उनकी|उनको|उन्हीं|जिसमें|जिसके|जिसकी|जिसका|जिसको|जिन्हें|जिन्हों|तिसमें|तिसके|तिसकी|तिसका|तिसको|तिन्हें|तिन्हों|किसे|किसका|किसकी|किसके|किसको|किन्हें|किन्हों|इत्यादि)\b/i,
  ],
}

// Platform detection patterns
const PLATFORM_PATTERNS = {
  duolingo: /duolingo|duo|lesson|skill|crown|lingot/i,
  babbel: /babbel|lesson|course|review/i,
  rosettaStone: /rosetta\s*stone|level|unit|lesson/i,
  // Add more platforms as needed
}

function detectLanguageContext(text: string): LanguageContext {
  // Initialize context
  const context: LanguageContext = {
    sourceLang: null,
    targetLang: null,
    platform: null,
    mode: null,
  }

  // Detect platform first
  for (const [platform, pattern] of Object.entries(PLATFORM_PATTERNS)) {
    if (pattern.test(text)) {
      context.platform = platform
      break
    }
  }

  // Look for translation indicators
  const translationPatterns = [
    /translate|translation|write.+in|say.+in/i,
    /[A-Za-z\s]+ → [A-Za-z\s]+/,
    /from [A-Za-z]+ to [A-Za-z]+/i,
  ]

  const isTranslationContext = translationPatterns.some((pattern) => pattern.test(text))

  // Detect languages
  const languageScores = Object.entries(LANGUAGE_PATTERNS)
    .map(([language, patterns]) => {
      const score = patterns.reduce((acc, pattern) => {
        const matches = text.match(pattern)
        return acc + (matches ? matches.length : 0)
      }, 0)
      return { language, score }
    })
    .sort((a, b) => b.score - a.score)

  if (languageScores.length >= 2 && languageScores[0].score > 0 && languageScores[1].score > 0) {
    // If we detect significant presence of two languages
    if (isTranslationContext) {
      context.mode = "translation"
      context.sourceLang = languageScores[1].language // Usually the source language has fewer matches
      context.targetLang = languageScores[0].language
    } else {
      context.mode = "learning"
      context.targetLang = languageScores[1].language // The language being learned usually has fewer matches
      context.sourceLang = languageScores[0].language
    }
  } else if (languageScores[0].score > 0) {
    // Single language detected
    context.mode = "practice"
    context.targetLang = languageScores[0].language
  }

  return context
}

// Add new interfaces for enhanced context awareness
interface WritingContext {
  type: "essay" | "email" | "technical" | "creative" | "presentation" | "other"
  style: "academic" | "professional" | "casual" | "technical"
  subject?: string
  purpose?: string
  audience?: string
}

interface ContentAnalysis {
  structure: {
    paragraphs: number
    sentencesPerParagraph: number[]
    topicSentences: string[]
  }
  style: {
    tone: string
    formality: number // 1-5 scale
    technicalLevel: number // 1-5 scale
  }
  suggestions: {
    type: "structure" | "style" | "vocabulary" | "grammar" | "content"
    text: string
    priority: number
  }[]
}

// Add writing patterns for detection
const WRITING_PATTERNS = {
  academic: {
    keywords: /thesis|hypothesis|research|study|analysis|conclude|therefore|moreover|furthermore/i,
    structures: /introduction|methodology|results|discussion|conclusion/i,
    citations: /$$\w+,\s*\d{4}$$|\[\d+\]/,
  },
  technical: {
    keywords: /technical|specification|implementation|system|process|procedure|mechanism/i,
    structures: /overview|requirements|design|implementation|testing/i,
    formatting: /fig\.|table|eq\./i,
  },
  email: {
    keywords: /dear|sincerely|regards|forward|reply|email/i,
    structures: /subject|body|signature/i,
    formatting: /^>|from:|to:|cc:|bcc:/i,
  },
  creative: {
    keywords: /character|plot|scene|setting|dialogue|story|narrative/i,
    structures: /chapter|act|scene|prologue|epilogue/i,
    stylistic: /metaphor|simile|imagery|symbolism/i,
  },
}

// Add subject matter detection
const SUBJECT_PATTERNS: Record<string, RegExp> = {
  engineering: /engineering|technical|mechanical|electrical|software|design|system|mechanism/i,
  science: /scientific|experiment|laboratory|hypothesis|data|analysis|research/i,
  business: /business|marketing|finance|management|strategy|corporate|market/i,
  literature: /literature|poetry|novel|character|theme|analysis|interpretation/i,
  history: /history|historical|civilization|era|century|ancient|modern/i,
  mathematics: /mathematics|algebra|geometry|calculus|equation|theorem|proof/i,
  computerScience: /programming|algorithm|data structure|software|coding|development/i,
  medicine: /medical|health|disease|treatment|diagnosis|patient|clinical/i,
  law: /legal|law|legislation|court|justice|attorney|plaintiff|defendant/i,
  psychology: /psychology|behavior|cognitive|mental|therapy|counseling|emotion/i,
}

function detectWritingContext(text: string): WritingContext {
  // Detect writing type
  const type = Object.entries(WRITING_PATTERNS).reduce(
    (detected, [patternType, patterns]) => {
      const score = Object.values(patterns).reduce((sum, pattern) => sum + (text.match(pattern)?.length || 0), 0)
      return score > detected.score ? { type: patternType as WritingContext["type"], score } : detected
    },
    { type: "other" as WritingContext["type"], score: 0 },
  ).type

  // Fixed subject detection
  const subjectDetection = Object.entries(SUBJECT_PATTERNS).reduce<{ subject: string | undefined; matches: number }>(
    (acc, [currentSubject, pattern]) => {
      const currentMatches = (text.match(pattern) || []).length
      return currentMatches > acc.matches ? { subject: currentSubject, matches: currentMatches } : acc
    },
    { subject: undefined, matches: 0 },
  )

  // Analyze style
  const academicScore = text.match(WRITING_PATTERNS.academic.keywords)?.length || 0
  const technicalScore = text.match(WRITING_PATTERNS.technical.keywords)?.length || 0
  const casualScore = text.match(/\b(like|maybe|kind of|sort of|basically)\b/gi)?.length || 0

  const style = academicScore > casualScore ? "academic" : technicalScore > casualScore ? "technical" : "casual"

  return {
    type,
    style,
    subject: subjectDetection.subject,
    purpose: detectPurpose(text),
    audience: detectAudience(text),
  }
}

function detectPurpose(text: string): string {
  const purposes = {
    inform: /explain|describe|inform|present|report|analyze/i,
    persuade: /argue|convince|persuade|propose|recommend/i,
    explore: /investigate|examine|explore|consider|evaluate/i,
    instruct: /guide|instruct|demonstrate|show how|steps|procedure/i,
  }

  const purposeDetection = Object.entries(purposes).reduce<{ purpose: string; matches: number }>(
    (acc, [currentPurpose, pattern]) => {
      const currentMatches = (text.match(pattern) || []).length
      return currentMatches > acc.matches ? { purpose: currentPurpose, matches: currentMatches } : acc
    },
    { purpose: "general", matches: 0 },
  )

  return purposeDetection.purpose
}

function detectAudience(text: string): string {
  const audiences = {
    academic: /professor|student|academic|scholarly|research/i,
    technical: /engineer|developer|specialist|professional/i,
    general: /reader|audience|public|people|everyone/i,
    business: /client|stakeholder|manager|executive|team/i,
  }

  const audienceDetection = Object.entries(audiences).reduce<{ audience: string; matches: number }>(
    (acc, [currentAudience, pattern]) => {
      const currentMatches = (text.match(pattern) || []).length
      return currentMatches > acc.matches ? { audience: currentAudience, matches: currentMatches } : acc
    },
    { audience: "general", matches: 0 },
  )

  return audienceDetection.audience
}

function analyzeContent(text: string, context: WritingContext): ContentAnalysis {
  const paragraphs = text.split(/\n\s*\n/)
  const sentences = paragraphs.map((p) => p.split(/[.!?]+/).filter(Boolean))

  return {
    structure: {
      paragraphs: paragraphs.length,
      sentencesPerParagraph: sentences.map((s) => s.length),
      topicSentences: sentences.map((s) => s[0]).filter(Boolean),
    },
    style: {
      tone: detectTone(text),
      formality: calculateFormality(text),
      technicalLevel: calculateTechnicalLevel(text, context),
    },
    suggestions: generateContextualSuggestions(text, context),
  }
}

function detectTone(text: string): string {
  // Implement tone detection logic here (e.g., using sentiment analysis)
  return "neutral" // Placeholder
}

function calculateFormality(text: string): number {
  // Implement formality calculation logic here (e.g., based on word choice)
  return 3 // Placeholder
}

function calculateTechnicalLevel(text: string, context: WritingContext): number {
  // Implement technical level calculation logic here (e.g., based on keywords and context)
  return 2 // Placeholder
}

function generateContextualSuggestions(text: string, context: WritingContext): ContentAnalysis["suggestions"] {
  // Implement suggestion generation logic here (e.g., based on content analysis and context)
  return [] // Placeholder
}

export function LanguageTutor() {
  const [isTutorActive, setIsTutorActive] = useState(false)
  const [languageContext, setLanguageContext] = useState<LanguageContext>({
    sourceLang: null,
    targetLang: null,
    platform: null,
    mode: null,
  })
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const lastProcessedText = useRef<string>("")
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [preferredLanguage, setPreferredLanguage] = useState<string>("french")
  const suggestionsContainerRef = useRef<HTMLDivElement>(null)
  const [userQuery, setUserQuery] = useState("")
  const [lastApiCallTimestamp, setLastApiCallTimestamp] = useState(0)
  const [significantChangeDetected, setSignificantChangeDetected] = useState(false)

  // Update the generateSuggestions function to use the new context awareness
  const generateSuggestions = useCallback(
    async (text: string, context: LanguageContext, isUserRequested = false) => {
      if (isGenerating) return

      const now = Date.now()
      if (!isUserRequested && now - lastApiCallTimestamp < 30000) {
        console.log("Skipping API call due to rate limiting")
        return
      }

      setIsGenerating(true)
      setLastApiCallTimestamp(now)

      try {
        // Detect writing context
        const writingContext = detectWritingContext(text)
        const contentAnalysis = analyzeContent(text, writingContext)

        const prompt = `
As an advanced language assistant, I'm helping someone with their ${writingContext.type} writing.
Context: They are writing ${writingContext.style} content about ${writingContext.subject || "a topic"}
Purpose: ${writingContext.purpose}
Audience: ${writingContext.audience}

Current text: "${text}"

${isUserRequested ? `User's specific question: "${userQuery}"` : ""}

Based on the analysis:
- Document type: ${writingContext.type}
- Style: ${writingContext.style}
- Technical level: ${contentAnalysis.style.technicalLevel}/5
- Formality: ${contentAnalysis.style.formality}/5

Provide ${isUserRequested ? "a detailed answer to the user's question" : "3 helpful suggestions"} focusing on:
1. Style and tone appropriateness for ${writingContext.audience} audience
2. Technical vocabulary and field-specific conventions for ${writingContext.subject || "the subject"}
3. Structure and flow improvements
4. Clarity and precision in communication

Format each suggestion as a clear, actionable recommendation.
`

        const { text: response } = await generateText({
          model: groq("gemma2-9b-it"),
          prompt,
          maxTokens: isUserRequested ? 300 : 200,
        })

        const parsedSuggestions = response.split("\n").filter((s) => s.trim().length > 0)
        const newSuggestions: Suggestion[] = parsedSuggestions.map((text) => ({
          id: Math.random().toString(36).substr(2, 9),
          text,
          timestamp: new Date(),
          type: isUserRequested ? "user-requested" : "auto",
        }))

        setSuggestions((prev) => [...newSuggestions, ...prev])

        if (suggestionsContainerRef.current) {
          suggestionsContainerRef.current.scrollTop = 0
        }
      } catch (error) {
        console.error("Failed to generate suggestions:", error)
      } finally {
        setIsGenerating(false)
        setSignificantChangeDetected(false)
      }
    },
    [isGenerating, lastApiCallTimestamp, userQuery],
  )

  const handleScreenDataChange = useCallback(
    (data: VisionEvent | null) => {
      if (data?.text && isTutorActive) {
        const newContext = detectLanguageContext(data.text)
        setLanguageContext(newContext)

        if (data.text !== lastProcessedText.current) {
          // Check for significant changes
          const hasSignificantChange = checkForSignificantChanges(data.text, lastProcessedText.current)

          if (hasSignificantChange) {
            setSignificantChangeDetected(true)
            if (suggestionTimeoutRef.current) {
              clearTimeout(suggestionTimeoutRef.current)
            }
            suggestionTimeoutRef.current = setTimeout(() => {
              generateSuggestions(data.text, newContext)
            }, 2000) // Increased delay to 2 seconds
          }

          lastProcessedText.current = data.text
        }
      }
    },
    [isTutorActive, generateSuggestions],
  )

  const checkForSignificantChanges = (newText: string, oldText: string): boolean => {
    // Implement logic to determine if the change is significant enough to warrant a new API call
    // This could include checking for new sentences, significant word count changes, etc.
    const wordCountDifference = Math.abs(newText.split(" ").length - oldText.split(" ").length)
    const newSentenceCount = (newText.match(/[.!?]+/g) || []).length
    const oldSentenceCount = (oldText.match(/[.!?]+/g) || []).length

    return wordCountDifference > 10 || newSentenceCount !== oldSentenceCount
  }

  const handleUserQuery = () => {
    if (userQuery.trim()) {
      generateSuggestions(lastProcessedText.current, languageContext, true)
      setUserQuery("")
    }
  }

  useEffect(() => {
    const monitorContent = async () => {
      try {
        for await (const event of pipe.streamVision(true)) {
          if (event.data) {
            handleScreenDataChange(event.data)
          }
        }
      } catch (error) {
        console.error("Failed to monitor content:", error)
      }
    }

    if (isTutorActive) {
      monitorContent()
    }

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current)
      }
    }
  }, [isTutorActive, handleScreenDataChange])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl font-bold">Language Tutor</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={preferredLanguage} onValueChange={setPreferredLanguage}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select target language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="french">French</SelectItem>
              <SelectItem value="spanish">Spanish</SelectItem>
              <SelectItem value="german">German</SelectItem>
              <SelectItem value="italian">Italian</SelectItem>
              <SelectItem value="portuguese">Portuguese</SelectItem>
              <SelectItem value="russian">Russian</SelectItem>
              <SelectItem value="japanese">Japanese</SelectItem>
              <SelectItem value="chinese">Chinese</SelectItem>
              <SelectItem value="korean">Korean</SelectItem>
              <SelectItem value="arabic">Arabic</SelectItem>
              <SelectItem value="hindi">Hindi</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setIsTutorActive(!isTutorActive)}
            variant={isTutorActive ? "destructive" : "default"}
            className="w-[140px]"
          >
            {isTutorActive ? (
              <>
                <Pause className="mr-2 h-4 w-4" /> Stop Tutor
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Start Tutor
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isTutorActive && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Languages className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">
                  {languageContext.mode ? (
                    <>
                      {languageContext.mode === "translation" ? "Translation" : "Learning"} Mode:
                      {languageContext.sourceLang && ` from ${languageContext.sourceLang}`}
                      {languageContext.targetLang && ` to ${languageContext.targetLang}`}
                    </>
                  ) : (
                    "Analyzing context..."
                  )}
                </span>
              </div>
              {languageContext.platform && (
                <Badge variant="outline" className="capitalize">
                  <Globe2 className="mr-1 h-4 w-4" />
                  {languageContext.platform}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Ask for Help</h4>
              <div className="flex space-x-2">
                <Textarea
                  placeholder="Ask a specific question about your current task..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="flex-grow"
                />
                <Button onClick={handleUserQuery} disabled={isGenerating}>
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Ask
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Language Suggestions</h4>
              {significantChangeDetected && !isGenerating && (
                <Badge variant="outline" className="mb-2">
                  Significant change detected
                </Badge>
              )}
              <div ref={suggestionsContainerRef} className="h-64 overflow-y-auto space-y-2 pr-2">
                <AnimatePresence>
                  {suggestions.map((suggestion) => (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className={`p-3 rounded-md shadow-sm ${
                        suggestion.type === "user-requested" ? "bg-blue-50" : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{suggestion.text}</p>
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-muted-foreground">{suggestion.timestamp.toLocaleTimeString()}</p>
                        <Badge variant="outline" className="text-xs">
                          {suggestion.type === "user-requested" ? "User Query" : "Auto"}
                        </Badge>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isGenerating && (
                  <div className="flex justify-center items-center h-12">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {!isTutorActive && (
          <div className="text-center py-8">
            <Languages className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-lg font-medium">Click "Start Tutor" to begin language assistance</p>
            <p className="text-sm text-muted-foreground mt-2">
              The Language Tutor will analyze your learning context and provide relevant suggestions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

