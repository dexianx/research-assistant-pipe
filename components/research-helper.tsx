"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { pipe, type VisionEvent } from "@screenpipe/browser"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  Play,
  Pause,
  Copy,
  Search,
  Lightbulb,
  Clipboard,
  MousePointer,
  Keyboard,
  Type,
  ArrowDown,
  Camera,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { toast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"

interface ResearchHelperProps {
  apiKey: string
  model: string
  isApiKeySet: boolean
}

interface ResearchItem {
  id: string
  text: string
  source: string
  timestamp: Date
  type: "auto" | "user-requested"
  relevanceScore: number
}

interface ChatMessage {
  role: "user" | "assistant" | "system"
  content: string
}

// Research-related keywords to detect
const RESEARCH_KEYWORDS = [
  "research",
  "study",
  "analysis",
  "data",
  "methodology",
  "results",
  "findings",
  "conclusion",
  "hypothesis",
  "experiment",
  "survey",
  "literature",
  "review",
  "journal",
  "publication",
  "evidence",
  "theory",
  "framework",
  "model",
  "variable",
  "correlation",
  "causation",
  "qualitative",
  "quantitative",
  "sample",
  "population",
  "statistical",
  "significance",
  "p-value",
  "confidence",
  "interval",
  "validity",
  "reliability",
  "bias",
  "limitation",
  "implication",
  "recommendation",
  "future",
  "research",
  "gap",
  "contribution",
]

export function ResearchHelper({ apiKey, model, isApiKeySet }: ResearchHelperProps) {
  const [isActive, setIsActive] = useState(false)
  const [researchItems, setResearchItems] = useState<ResearchItem[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [userQuery, setUserQuery] = useState("")
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [isResponding, setIsResponding] = useState(false)
  const [selectedResearchText, setSelectedResearchText] = useState("")
  const [automationUrl, setAutomationUrl] = useState("")
  const [automationStatus, setAutomationStatus] = useState<string | null>(null)
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.3)
  const [combinedResearchText, setCombinedResearchText] = useState("")
  const [pixelText, setPixelText] = useState("")
  const [pixelKey, setPixelKey] = useState("enter")
  const [pixelX, setPixelX] = useState(100)
  const [pixelY, setPixelY] = useState(200)
  const [pixelButton, setPixelButton] = useState<"left" | "right" | "middle">("left")
  const [isCapturing, setIsCapturing] = useState(false)

  const lastProcessedText = useRef<string>("")
  const researchContainerRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)

  // Update combined research text whenever research items change
  useEffect(() => {
    const combined = researchItems
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .map((item) => `[${item.source}] ${item.text}`)
      .join("\n\n")

    setCombinedResearchText(combined)
  }, [researchItems])

  // Calculate relevance score for research text
  const calculateRelevanceScore = (text: string): number => {
    if (!text || text.length < 20) return 0

    const words = text.toLowerCase().split(/\s+/)
    const uniqueWords = new Set(words)

    let keywordMatches = 0
    RESEARCH_KEYWORDS.forEach((keyword) => {
      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        keywordMatches++
      }
    })

    // Calculate relevance based on keyword density and text length
    const keywordDensity = keywordMatches / words.length
    const lengthFactor = Math.min(1, text.length / 500) // Favor longer texts up to 500 chars

    return keywordDensity * 0.7 + lengthFactor * 0.3
  }

  // Process screen data to extract research content
  const processScreenData = useCallback(
    (data: VisionEvent) => {
      if (!data.text || data.text === lastProcessedText.current) return

      const text = data.text
      lastProcessedText.current = text

      // Calculate relevance score
      const relevanceScore = calculateRelevanceScore(text)

      // Only add if relevance score is above threshold
      if (relevanceScore > relevanceThreshold) {
        const newItem: ResearchItem = {
          id: Math.random().toString(36).substr(2, 9),
          text: text,
          source: data.app_name || "Unknown",
          timestamp: new Date(),
          type: "auto",
          relevanceScore: relevanceScore,
        }

        setResearchItems((prev) => {
          // Check if we already have very similar content
          const isDuplicate = prev.some(
            (item) => item.text.length > 0 && (item.text.includes(text) || text.includes(item.text)),
          )

          if (isDuplicate) return prev
          return [newItem, ...prev]
        })
      }
    },
    [relevanceThreshold],
  )

  // Copy research text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied to clipboard",
        description: "The research text has been copied to your clipboard.",
        action: <ToastAction altText="Close">Close</ToastAction>,
      })
    })
  }

  // Send query to AI
  const sendQuery = async () => {
    if (!apiKey || !isApiKeySet) {
      toast({
        title: "API Key Required",
        description: "Please set your Nebius API key in the configuration section.",
        variant: "destructive",
      })
      return
    }

    if (!userQuery.trim()) return

    const newUserMessage: ChatMessage = {
      role: "user",
      content: userQuery,
    }

    setChatMessages((prev) => [...prev, newUserMessage])
    setIsResponding(true)

    try {
      // Prepare context from research items
      const context = selectedResearchText || combinedResearchText

      // Prepare system message with context
      const systemMessage = {
        role: "system",
        content: `You are a research assistant helping with academic and scientific research. 
        Use the following research context to inform your responses. If the question cannot be 
        answered using this context, say so and provide general guidance.
        
        RESEARCH CONTEXT:
        ${context}`,
      }

      // Prepare messages for API
      const messages = [systemMessage, ...chatMessages, newUserMessage]

      const response = await fetch("/api/ai-completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages,
          model,
          apiKey,
          max_tokens: 1000,
          temperature: 0.7,
        }),
      })

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: data.choices[0].message.content,
      }

      setChatMessages((prev) => [...prev, assistantMessage])
      setUserQuery("")

      // Scroll to bottom of chat
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    } catch (error) {
      console.error("Error sending query:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get response from AI",
        variant: "destructive",
      })
    } finally {
      setIsResponding(false)
    }
  }

  // Run automation to search for research
  const runAutomation = async () => {
    if (!automationUrl) {
      toast({
        title: "URL Required",
        description: "Please enter a URL to search for research.",
        variant: "destructive",
      })
      return
    }

    setAutomationStatus("running")

    try {
      // Open Chrome using pixel automation
      await pipe.operator.pixel.type("chrome")
      await pipe.operator.pixel.press("enter")

      // Wait for Chrome to open
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Type the URL
      await pipe.operator.pixel.type(automationUrl)
      await pipe.operator.pixel.press("enter")

      // Wait for page to load
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Type search query
      await pipe.operator.pixel.type("research methodology")
      await pipe.operator.pixel.press("enter")

      // Wait for search results
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Capture the screen after search
      await captureScreen()

      // Scroll down to see more results
      await pipe.operator.pixel.press("pagedown")

      // Wait a moment and capture again after scrolling
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await captureScreen()

      setAutomationStatus("completed")

      toast({
        title: "Automation Complete",
        description: "Research search automation completed successfully.",
      })
    } catch (error) {
      console.error("Automation failed:", error)
      setAutomationStatus("failed")
      toast({
        title: "Automation Failed",
        description: error instanceof Error ? error.message : "Failed to run automation",
        variant: "destructive",
      })
    }
  }

  // Capture screen function (used by automation and manual capture)
  const captureScreen = async () => {
    try {
      setIsCapturing(true)

      // Create a stream and get just the first event
      const visionStream = pipe.streamVision(true)
      const event = await visionStream.next()

      // Process the event if it has data
      if (event.value?.data) {
        console.log("Captured vision event:", {
          app: event.value.data.app_name,
          window: event.value.data.window_name,
          hasText: !!event.value.data.text,
          hasImage: !!event.value.data.image,
        })

        // Process the captured data
        processScreenData(event.value.data)
      }

      // Close the stream
      await visionStream.return()

      return true
    } catch (error) {
      console.error("Failed to capture screen:", error)
      const errorMessage = error instanceof Error ? `Failed to capture: ${error.message}` : "Failed to capture screen"

      toast({
        title: "Capture Failed",
        description: errorMessage,
        variant: "destructive",
      })

      return false
    } finally {
      setIsCapturing(false)
    }
  }

  // Handle manual capture button click
  const handleManualCapture = async () => {
    const success = await captureScreen()

    if (success) {
      toast({
        title: "Capture Successful",
        description: "Screen content captured successfully",
      })
    }
  }

  // Pixel automation functions
  const handlePixelType = async () => {
    if (!pixelText) {
      toast({
        title: "Text Required",
        description: "Please enter text to type",
        variant: "destructive",
      })
      return
    }

    try {
      await pipe.operator.pixel.type(pixelText)
      toast({
        title: "Success",
        description: `Typed: ${pixelText}`,
      })
    } catch (error) {
      console.error("Failed to type text:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to type text",
        variant: "destructive",
      })
    }
  }

  const handlePixelPress = async () => {
    try {
      await pipe.operator.pixel.press(pixelKey)
      toast({
        title: "Success",
        description: `Pressed key: ${pixelKey}`,
      })
    } catch (error) {
      console.error("Failed to press key:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to press key",
        variant: "destructive",
      })
    }
  }

  const handlePixelMoveMouse = async () => {
    try {
      await pipe.operator.pixel.moveMouse(pixelX, pixelY)
      toast({
        title: "Success",
        description: `Moved mouse to: ${pixelX}, ${pixelY}`,
      })
    } catch (error) {
      console.error("Failed to move mouse:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move mouse",
        variant: "destructive",
      })
    }
  }

  const handlePixelClick = async () => {
    try {
      await pipe.operator.pixel.click(pixelButton)
      toast({
        title: "Success",
        description: `Clicked ${pixelButton} mouse button`,
      })
    } catch (error) {
      console.error("Failed to click:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to click",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button
          onClick={() => setIsActive(!isActive)}
          variant={isActive ? "destructive" : "default"}
          className="w-[140px]"
        >
          {isActive ? (
            <>
              <Pause className="mr-2 h-4 w-4" /> Stop Tracking
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Start Tracking
            </>
          )}
        </Button>

        <Button variant="outline" size="sm" onClick={handleManualCapture} disabled={isCapturing}>
          {isCapturing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          Capture Screen
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Research Content</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(combinedResearchText)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy All
              </Button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Label htmlFor="relevance-threshold" className="min-w-24">
              Relevance Threshold: {relevanceThreshold.toFixed(1)}
            </Label>
            <Slider
              id="relevance-threshold"
              min={0}
              max={1}
              step={0.1}
              value={[relevanceThreshold]}
              onValueChange={(value) => setRelevanceThreshold(value[0])}
              className="flex-1"
            />
          </div>

          <div ref={researchContainerRef} className="h-[400px] overflow-y-auto space-y-2 pr-2 border rounded-md p-2">
            <AnimatePresence>
              {researchItems.length > 0 ? (
                researchItems
                  .sort((a, b) => b.relevanceScore - a.relevanceScore)
                  .map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      className="p-3 rounded-md shadow-sm bg-muted relative"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <Badge variant="outline" className="mb-1">
                          {item.source}
                        </Badge>
                        <Badge variant={item.relevanceScore > 0.6 ? "default" : "secondary"} className="text-xs">
                          {(item.relevanceScore * 100).toFixed(0)}% relevant
                        </Badge>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{item.text}</p>
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-xs text-muted-foreground">{item.timestamp.toLocaleTimeString()}</p>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => copyToClipboard(item.text)}>
                            <Clipboard className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setSelectedResearchText(item.text)}>
                            <Lightbulb className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
              ) : (
                <div className="text-center p-8 text-muted-foreground">
                  No research content captured yet. Use the "Capture Screen" button to collect research data.
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="space-y-4">
          <Tabs defaultValue="chat">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat">AI Chat</TabsTrigger>
              <TabsTrigger value="automation">Automation</TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="space-y-4">
              <div ref={chatContainerRef} className="h-[300px] overflow-y-auto border rounded-md p-2">
                {chatMessages.length > 0 ? (
                  chatMessages.map((message, index) => (
                    <div key={index} className={`mb-3 ${message.role === "user" ? "text-right" : "text-left"}`}>
                      <div
                        className={`inline-block p-3 rounded-lg max-w-[80%] ${
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}
                      >
                        <p className="whitespace-pre-wrap text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-8 text-muted-foreground">
                    Ask questions about your research content to get AI assistance.
                  </div>
                )}
                {isResponding && (
                  <div className="text-left mb-3">
                    <div className="inline-block p-3 rounded-lg bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex space-x-2">
                <Textarea
                  placeholder="Ask about your research content..."
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="flex-grow"
                  disabled={isResponding || !isApiKeySet}
                />
                <Button onClick={sendQuery} disabled={isResponding || !userQuery.trim() || !isApiKeySet}>
                  {isResponding ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
                </Button>
              </div>

              {selectedResearchText && (
                <div className="border rounded-md p-2 bg-muted/50">
                  <div className="flex justify-between items-center mb-1">
                    <Badge variant="outline">Selected Context</Badge>
                    <Button variant="ghost" size="icon" onClick={() => setSelectedResearchText("")}>
                      <span className="sr-only">Clear</span>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                      </svg>
                    </Button>
                  </div>
                  <p className="text-xs line-clamp-3">{selectedResearchText}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="automation" className="space-y-4">
              <Card>
                <CardContent className="p-4 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="automation-url">Research URL</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="automation-url"
                        placeholder="Enter URL to search for research"
                        value={automationUrl}
                        onChange={(e) => setAutomationUrl(e.target.value)}
                      />
                      <Button onClick={runAutomation} disabled={automationStatus === "running" || !automationUrl}>
                        {automationStatus === "running" ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="mr-2 h-4 w-4" />
                        )}
                        Search
                      </Button>
                    </div>
                  </div>

                  {automationStatus && (
                    <div
                      className={`p-3 rounded-md ${
                        automationStatus === "completed"
                          ? "bg-green-50 text-green-700"
                          : automationStatus === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      <p className="text-sm">
                        Automation {automationStatus}
                        {automationStatus === "running" && (
                          <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />
                        )}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Pixel Controls</h4>

                <div className="border rounded-md p-3 space-y-3">
                  <div className="grid gap-2">
                    <Label htmlFor="pixel-text">Type Text</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="pixel-text"
                        placeholder="Text to type"
                        value={pixelText}
                        onChange={(e) => setPixelText(e.target.value)}
                      />
                      <Button onClick={handlePixelType} variant="outline">
                        <Type className="mr-2 h-4 w-4" />
                        Type
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="pixel-key">Press Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="pixel-key"
                        placeholder="Key to press"
                        value={pixelKey}
                        onChange={(e) => setPixelKey(e.target.value)}
                      />
                      <Button onClick={handlePixelPress} variant="outline">
                        <Keyboard className="mr-2 h-4 w-4" />
                        Press
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Move Mouse</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="pixel-x" className="w-8">
                          X:
                        </Label>
                        <Input
                          id="pixel-x"
                          type="number"
                          value={pixelX}
                          onChange={(e) => setPixelX(Number.parseInt(e.target.value))}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Label htmlFor="pixel-y" className="w-8">
                          Y:
                        </Label>
                        <Input
                          id="pixel-y"
                          type="number"
                          value={pixelY}
                          onChange={(e) => setPixelY(Number.parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button onClick={handlePixelMoveMouse} variant="outline" className="mt-1">
                      <MousePointer className="mr-2 h-4 w-4" />
                      Move Mouse
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="pixel-button">Mouse Click</Label>
                    <div className="flex space-x-2">
                      <Select
                        value={pixelButton}
                        onValueChange={(value: "left" | "right" | "middle") => setPixelButton(value)}
                      >
                        <SelectTrigger id="pixel-button">
                          <SelectValue placeholder="Select button" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="left">Left</SelectItem>
                          <SelectItem value="right">Right</SelectItem>
                          <SelectItem value="middle">Middle</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handlePixelClick} variant="outline">
                        <ArrowDown className="mr-2 h-4 w-4" />
                        Click
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}

