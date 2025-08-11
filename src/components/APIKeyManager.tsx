"use client";

import React, { useState } from "react";
import { APIKeys, APIKeyManagerProps } from "@/types";
import { useApp } from "@/contexts/AppContext";
import { validateAPIKeys, sanitizeAPIKey } from "@/utils/validation";
import { Card, CardHeader, CardContent, Button, Input } from "@/components/ui";

const APIKeyManager: React.FC<APIKeyManagerProps> = ({
  onKeysValidated,
  isLoading = false,
}) => {
  const { apiKeys, setApiKeys, clearApiKeys, error, setError, clearError } =
    useApp();

  const [formKeys, setFormKeys] = useState<APIKeys>({
    openaiKey: apiKeys?.openaiKey || "",
    elevenlabsKey: apiKeys?.elevenlabsKey || "",
  });
  const [showKeys, setShowKeys] = useState({
    openai: false,
    elevenlabs: false,
  });
  const [isValidating, setIsValidating] = useState(false);
  const [isEditing, setIsEditing] = useState(!apiKeys);

  const handleInputChange = (field: keyof APIKeys, value: string) => {
    setFormKeys((prev) => ({
      ...prev,
      [field]: value,
    }));
    clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formKeys.openaiKey.trim() || !formKeys.elevenlabsKey.trim()) {
      setError("Both API keys are required");
      return;
    }

    setIsValidating(true);
    clearError();

    // Basic validation
    const validation = validateAPIKeys(formKeys);
    if (!validation.isValid) {
      setError(validation.errors.join(", "));
      setIsValidating(false);
      return;
    }

    // Store keys and notify parent
    setApiKeys(formKeys);
    onKeysValidated(formKeys);
    setIsEditing(false);
    setIsValidating(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    if (apiKeys) {
      setFormKeys(apiKeys);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (apiKeys) {
      setFormKeys({
        openaiKey: sanitizeAPIKey(apiKeys.openaiKey),
        elevenlabsKey: sanitizeAPIKey(apiKeys.elevenlabsKey),
      });
    }
  };

  const handleClear = () => {
    clearApiKeys();
    setFormKeys({
      openaiKey: "",
      elevenlabsKey: "",
    });
    setIsEditing(true);
  };

  const toggleShowKey = (keyType: "openai" | "elevenlabs") => {
    setShowKeys((prev) => ({
      ...prev,
      [keyType]: !prev[keyType],
    }));
  };

  const getInputType = (keyType: "openai" | "elevenlabs") => {
    return showKeys[keyType] ? "text" : "password";
  };

  return (
    <Card
      variant="elevated"
      className="max-w-2xl mx-auto"
      data-tutorial="api-keys"
    >
      <CardHeader padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span
                className="text-primary text-xl"
                role="img"
                aria-label="Key"
              >
                🔑
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                API Key Configuration
              </h2>
              <p className="text-sm text-muted-foreground">
                Securely configure your OpenAI and ElevenLabs API keys
              </p>
            </div>
          </div>
          {apiKeys && !isEditing && (
            <div className="flex items-center space-x-2">
              <span className="text-success text-sm font-medium flex items-center gap-1">
                <span role="img" aria-label="Success">
                  ✓
                </span>
                Keys Configured
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                disabled={isLoading}
              >
                Edit
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent padding="md">
        {/* Error Display */}
        {error && (
          <Card
            variant="outlined"
            className="mb-6 border-destructive/20 bg-destructive/5"
          >
            <CardContent padding="sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-destructive/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span
                    className="text-destructive text-sm"
                    role="img"
                    aria-label="Error"
                  >
                    ⚠️
                  </span>
                </div>
                <div>
                  <h3 className="text-destructive font-medium mb-2">Error:</h3>
                  <p className="text-destructive/80 text-sm">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* OpenAI API Key */}
          <div>
            <Input
              id="openai-key"
              label="OpenAI API Key"
              type={getInputType("openai")}
              value={formKeys.openaiKey}
              onChange={(e) => handleInputChange("openaiKey", e.target.value)}
              placeholder="sk-..."
              disabled={!isEditing || isValidating || isLoading}
              required
              helperText="Your OpenAI API key for text generation"
              rightIcon={
                <button
                  type="button"
                  onClick={() => toggleShowKey("openai")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={!isEditing}
                  aria-label={showKeys.openai ? "Hide API key" : "Show API key"}
                >
                  {showKeys.openai ? "👁️" : "👁️‍🗨️"}
                </button>
              }
            />
          </div>

          {/* ElevenLabs API Key */}
          <div>
            <Input
              id="elevenlabs-key"
              label="ElevenLabs API Key"
              type={getInputType("elevenlabs")}
              value={formKeys.elevenlabsKey}
              onChange={(e) =>
                handleInputChange("elevenlabsKey", e.target.value)
              }
              placeholder="Enter your ElevenLabs API key"
              disabled={!isEditing || isValidating || isLoading}
              required
              helperText="Your ElevenLabs API key for voice synthesis"
              rightIcon={
                <button
                  type="button"
                  onClick={() => toggleShowKey("elevenlabs")}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  disabled={!isEditing}
                  aria-label={
                    showKeys.elevenlabs ? "Hide API key" : "Show API key"
                  }
                >
                  {showKeys.elevenlabs ? "👁️" : "👁️‍🗨️"}
                </button>
              }
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {isEditing && (
                <>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={
                      isValidating ||
                      isLoading ||
                      !formKeys.openaiKey.trim() ||
                      !formKeys.elevenlabsKey.trim()
                    }
                    isLoading={isValidating}
                    loadingText="Validating..."
                  >
                    Validate & Save
                  </Button>
                  {apiKeys && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isValidating || isLoading}
                    >
                      Cancel
                    </Button>
                  )}
                </>
              )}
            </div>

            {apiKeys && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleClear}
                disabled={isValidating || isLoading}
                size="sm"
              >
                Clear Keys
              </Button>
            )}
          </div>
        </form>

        {/* Security Notice */}
        <Card variant="outlined" className="mt-6 border-info/20 bg-info/5">
          <CardContent padding="sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-info/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <span
                  className="text-info text-sm"
                  role="img"
                  aria-label="Security"
                >
                  🔒
                </span>
              </div>
              <div>
                <h3 className="text-info font-medium mb-2">Security Notice</h3>
                <p className="text-info/80 text-sm">
                  Your API keys are stored securely in your browser&apos;s
                  session storage and will be automatically cleared when you
                  close your browser. Keys are never sent to our servers or
                  stored permanently.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default APIKeyManager;
