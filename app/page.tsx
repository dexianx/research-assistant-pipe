"use client"

import { useState, useEffect } from "react"
import { HealthStatus } from "@/components/health-status"
import { ResearchHelper } from "@/components/research-helper"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NEBIUS_MODELS } from "@/lib/models"

export default function Home() {
  const [healthData, setHealthData] = useState<any>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [isHealthy, setIsHealthy] = useState<boolean>(false)
  const [apiKey, setApiKey] = useState<string>("")
  const [selectedModel, setSelectedModel] = useState<string>("meta-llama/Meta-Llama-3.1-70B-Instruct")
  const [isApiKeySet, setIsApiKeySet] = useState<boolean>(false)

  // Handle health data changes
  const handleHealthDataChange = (data: any, error: string | null) => {
    setHealthData(data)
    setHealthError(error)

    // Check if the connection is healthy
    if (error) {
      console.log("Health check error:", error)
      setIsHealthy(false)
      return
    }

    // If we have data and no error, consider it healthy
    if (data) {
      console.log("Health data received:", data)

      // Check for explicit status if available
      if (data.status) {
        const status = data.status.toLowerCase()
        const isHealthyStatus = status === "healthy" || status === "ok" || status === "up" || status === "running"

        console.log("Health status:", status, "isHealthy:", isHealthyStatus)
        setIsHealthy(isHealthyStatus)
      } else {
        // If no status but we have data and no error, consider it healthy
        console.log("No explicit status, but received data without error - considering healthy")
        setIsHealthy(true)
      }
    } else {
      console.log("No health data received")
      setIsHealthy(false)
    }
  }

  // Debug health status
  useEffect(() => {
    console.log("Current health status:", isHealthy ? "Healthy" : "Not healthy")
  }, [isHealthy])

  // Save API key to local storage when set
  useEffect(() => {
    const savedApiKey = localStorage.getItem("nebius_api_key")
    const savedModel = localStorage.getItem("nebius_model")

    if (savedApiKey) {
      setApiKey(savedApiKey)
      setIsApiKeySet(true)
    }

    if (savedModel) {
      setSelectedModel(savedModel)
    }
  }, [])

  const handleSaveApiKey = () => {
    if (apiKey) {
      localStorage.setItem("nebius_api_key", apiKey)
      setIsApiKeySet(true)
    }
  }

  const handleModelChange = (value: string) => {
    setSelectedModel(value)
    localStorage.setItem("nebius_model", value)
  }

  return (
    <main className="container mx-auto py-6 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-6">Research Helper</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Connection</CardTitle>
            <CardDescription>
              Check the connection status with Screenpipe before using the research helper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <HealthStatus onDataChange={handleHealthDataChange} endpoint="http://localhost:3030/health" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Nebius AI Configuration</CardTitle>
            <CardDescription>Configure your Nebius AI API key and model settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="api-key">Nebius API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Enter your Nebius API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <Button onClick={handleSaveApiKey}>Save Key</Button>
                </div>
                {isApiKeySet && <p className="text-sm text-green-600">API key is set and stored in your browser</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="model-select">AI Model</Label>
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger id="model-select">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {NEBIUS_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!isHealthy ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Connection Error</AlertTitle>
            <AlertDescription>
              The research helper requires a healthy connection to Screenpipe. Please ensure Screenpipe is running and
              try again.
            </AlertDescription>
          </Alert>
        ) : (
          <Tabs defaultValue="research">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="research">Research Helper</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="research">
              <Card>
                <CardHeader>
                  <CardTitle>Research Assistant</CardTitle>
                  <CardDescription>Track and analyze research content from your screen</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResearchHelper apiKey={apiKey} model={selectedModel} isApiKeySet={isApiKeySet} />
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle>Research Settings</CardTitle>
                  <CardDescription>Configure your research helper preferences</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Settings content would go here */}
                    <p>Settings panel coming soon...</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </main>
  )
}

