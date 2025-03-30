"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Download,
  Copy,
  Image as ImageIcon,
  Sparkles,
  Wand2,
  RefreshCw,
  Check,
  X,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { GradientTitle } from "@/components/gradient-title";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Define image size options
type ImageSize =
  | "512x512"
  | "768x768"
  | "1024x1024"
  | "1024x1792"
  | "1792x1024";

// Define style presets
interface StylePreset {
  name: string;
  description: string;
  promptPrefix: string;
  icon: React.ReactNode;
}

const stylePresets: StylePreset[] = [
  {
    name: "Realistic",
    description: "Photorealistic style with natural lighting and details",
    promptPrefix: "Photorealistic image of",
    icon: <ImageIcon className='h-4 w-4' />,
  },
  {
    name: "3D Render",
    description: "Modern 3D rendered style with clean surfaces",
    promptPrefix: "3D rendered image of",
    icon: <Sparkles className='h-4 w-4' />,
  },
  {
    name: "Anime",
    description: "Japanese anime style illustration",
    promptPrefix: "Anime style illustration of",
    icon: <Wand2 className='h-4 w-4' />,
  },
  {
    name: "Watercolor",
    description: "Artistic watercolor painting style",
    promptPrefix: "Watercolor painting of",
    icon: <Sparkles className='h-4 w-4' />,
  },
  {
    name: "Pixel Art",
    description: "Retro pixel art style",
    promptPrefix: "Pixel art of",
    icon: <ImageIcon className='h-4 w-4' />,
  },
];

// Define example prompts
const examplePrompts = [
  "A serene Japanese garden with cherry blossoms, a small bridge over a koi pond, and traditional lanterns",
  "A futuristic cityscape at night with neon lights, flying cars, and towering skyscrapers",
  "A cozy cabin in the woods during autumn, with smoke coming from the chimney and fallen leaves around",
  "An underwater scene with colorful coral reefs, tropical fish, and sunlight filtering through the water",
  "A fantasy dragon perched on a mountain overlooking a medieval castle",
];

// Interface for generated image history
interface GeneratedImage {
  imageUrl: string;
  prompt: string;
  size: ImageSize;
  timestamp: Date;
}

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [textResponse, setTextResponse] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [selectedSize, setSelectedSize] = useState<ImageSize>("1024x1024");
  const [selectedStyle, setSelectedStyle] = useState<StylePreset | null>(null);
  const [imageHistory, setImageHistory] = useState<GeneratedImage[]>([]);
  const [activeTab, setActiveTab] = useState("create");
  const [copySuccess, setCopySuccess] = useState(false);

  // Function to clear image history
  const clearImageHistory = () => {
    setImageHistory([]);
    localStorage.removeItem("imageHistory");
    setError(""); // Clear any error messages
  };

  // Function to download the image history as JSON
  const downloadImageHistory = () => {
    try {
      const dataStr = JSON.stringify(imageHistory, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `image-history-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();
    } catch (e) {
      console.error("Failed to download image history:", e);
      setError("Failed to download image history.");
    }
  };

  // Load image history from localStorage on component mount
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem("imageHistory");
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        // Convert string dates back to Date objects and ensure correct types
        const historyWithDates = parsedHistory.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
          size: item.size as ImageSize,
        }));
        setImageHistory(historyWithDates);
      }
    } catch (error) {
      console.error("Error loading image history:", error);
      setError("Failed to load image history");
    }
  }, []);

  // Save image history to localStorage when it changes
  useEffect(() => {
    if (imageHistory.length > 0) {
      try {
        // Try to save to localStorage
        localStorage.setItem("imageHistory", JSON.stringify(imageHistory));
      } catch (e) {
        console.error("Failed to save image history:", e);

        if (e instanceof DOMException && e.name === "QuotaExceededError") {
          // If quota is exceeded, reduce the history size and try again
          const reducedHistory = imageHistory.slice(
            0,
            Math.max(5, imageHistory.length / 2)
          );
          setImageHistory(reducedHistory);

          // Show error message
          setError(
            "Storage limit reached. Some older images have been removed."
          );

          // Try again with reduced history
          try {
            localStorage.setItem(
              "imageHistory",
              JSON.stringify(reducedHistory)
            );
          } catch (innerError) {
            // If still failing, clear all history as last resort
            localStorage.removeItem("imageHistory");
            setImageHistory([]);
            setError(
              "Storage limit reached. All image history has been cleared."
            );
          }
        }
      }
    }
  }, [imageHistory]);

  const applyExamplePrompt = (example: string) => {
    setPrompt(example);
  };

  const applyStylePreset = (preset: StylePreset) => {
    setSelectedStyle(preset);
    // Don't modify the user's prompt if they've already entered something
    if (!prompt.trim()) {
      setPrompt(preset.promptPrefix + " ");
    }
  };

  const copyPromptToClipboard = () => {
    navigator.clipboard.writeText(prompt);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError("");
    setGeneratedImage(null);
    setTextResponse("");

    // Prepare the final prompt with style preset if selected
    const finalPrompt = selectedStyle
      ? prompt.startsWith(selectedStyle.promptPrefix)
        ? prompt
        : `${selectedStyle.promptPrefix} ${prompt}`
      : prompt;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: finalPrompt,
          size: selectedSize,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate image");
      }

      if (data.imageData) {
        const imageUrl = `data:image/png;base64,${data.imageData}`;
        setGeneratedImage(imageUrl);

        // Add to history - but limit the size of stored images
        try {
          // Create a more storage-efficient version by compressing the image data
          // For base64 images, we'll keep only the first 10 most recent full images
          // and store metadata for the rest
          const newImage: GeneratedImage = {
            imageUrl,
            prompt: finalPrompt,
            timestamp: new Date(),
            size: selectedSize,
          };

          // Keep only 10 most recent images with full data
          setImageHistory((prev) => {
            const newHistory = [newImage, ...prev.slice(0, 9)];
            return newHistory;
          });
        } catch (storageError) {
          console.error("Failed to add image to history:", storageError);
          // Continue without adding to history
          setError(
            "Unable to save image to history due to storage limitations."
          );
        }
      }

      if (data.textResponse) {
        setTextResponse(data.textResponse);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Update the deleteImage function to handle local storage
  const deleteImage = (index: number) => {
    if (window.confirm("Are you sure you want to delete this image?")) {
      const updatedHistory = imageHistory.filter((_, i) => i !== index);
      setImageHistory(updatedHistory);
      localStorage.setItem("imageHistory", JSON.stringify(updatedHistory));
      setError("");
    }
  };

  // Update the function that adds new images to also update local storage
  const handleImageGenerated = (newImage: {
    imageUrl: string;
    prompt: string;
    size: ImageSize;
  }) => {
    const imageWithTimestamp: GeneratedImage = {
      ...newImage,
      timestamp: new Date(),
    };

    const updatedHistory = [...imageHistory, imageWithTimestamp];
    setImageHistory(updatedHistory);

    // Save to local storage
    localStorage.setItem("imageHistory", JSON.stringify(updatedHistory));

    setIsGenerating(false);
    setActiveTab("gallery");
  };

  return (
    <div className='container mx-auto px-4 py-8'>
      <div className='mb-8 text-center'>
        <Link
          href='/'
          className='text-blue-500 hover:underline mb-4 inline-block'
        >
          ← Back to Chat
        </Link>
        <GradientTitle>AI Image Generator</GradientTitle>
        <p className='text-gray-600 dark:text-gray-400 mt-2'>
          Create beautiful AI-generated images with BK Zen Vibe
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className='max-w-5xl mx-auto'
      >
        <TabsList className='grid w-full grid-cols-2 mb-8'>
          <TabsTrigger value='create' className='text-center py-3'>
            <Sparkles className='h-4 w-4 mr-2' />
            Create Images
          </TabsTrigger>
          <TabsTrigger value='gallery' className='text-center py-3'>
            <ImageIcon className='h-4 w-4 mr-2' />
            Your Gallery ({imageHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value='create' className='mt-0'>
          <Card className='border-t-0 rounded-tl-none rounded-tr-none'>
            <CardHeader>
              <CardTitle>Create a New Image</CardTitle>
              <CardDescription>
                Enter a detailed description of the image you want to generate
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Style Presets */}
              <div>
                <h3 className='text-sm font-medium mb-3'>
                  Choose a Style (Optional)
                </h3>
                <div className='flex flex-wrap gap-3 mb-1'>
                  {stylePresets.map((preset) => (
                    <TooltipProvider key={preset.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={
                              selectedStyle?.name === preset.name
                                ? "secondary"
                                : "outline"
                            }
                            size='sm'
                            onClick={() => applyStylePreset(preset)}
                            className={`flex items-center gap-2 px-4 py-2 h-10 rounded-md transition-all ${
                              selectedStyle?.name === preset.name
                                ? "bg-primary/10 border-primary/30 text-primary font-medium"
                                : "hover:bg-primary/5"
                            }`}
                          >
                            <div
                              className={`${
                                selectedStyle?.name === preset.name
                                  ? "text-primary"
                                  : "text-muted-foreground"
                              } transition-colors`}
                            >
                              {preset.icon}
                            </div>
                            {preset.name}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side='bottom'>
                          <p>{preset.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                </div>
              </div>

              {/* Image Size Selection */}
              <div>
                <h3 className='text-sm font-medium mb-3'>Image Size</h3>
                <Select
                  value={selectedSize}
                  onValueChange={(value) => setSelectedSize(value as ImageSize)}
                >
                  <SelectTrigger className='w-full sm:w-[240px]'>
                    <SelectValue placeholder='Select size' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='512x512'>Small (512×512)</SelectItem>
                    <SelectItem value='768x768'>Medium (768×768)</SelectItem>
                    <SelectItem value='1024x1024'>Large (1024×1024)</SelectItem>
                    <SelectItem value='1024x1792'>
                      Portrait (1024×1792)
                    </SelectItem>
                    <SelectItem value='1792x1024'>
                      Landscape (1792×1024)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Prompt Input */}
              <div>
                <div className='flex justify-between items-center mb-2'>
                  <h3 className='text-sm font-medium'>Your Prompt</h3>
                  <div className='flex items-center gap-2'>
                    {prompt && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant='ghost'
                              size='icon'
                              onClick={copyPromptToClipboard}
                              className='h-8 w-8'
                            >
                              {copySuccess ? (
                                <Check className='h-4 w-4' />
                              ) : (
                                <Copy className='h-4 w-4' />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{copySuccess ? "Copied!" : "Copy prompt"}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            onClick={() => setPrompt("")}
                            disabled={!prompt}
                            className='h-8 w-8'
                          >
                            <X className='h-4 w-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Clear prompt</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>
                <Textarea
                  placeholder='A serene Japanese garden with cherry blossoms, a small bridge over a koi pond, and traditional lanterns...'
                  value={prompt}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setPrompt(e.target.value)
                  }
                  className='min-h-32 mb-2'
                />

                {/* Example prompts */}
                <div className='mt-2'>
                  <p className='text-xs text-muted-foreground mb-2'>
                    Need inspiration? Try one of these:
                  </p>
                  <div className='flex flex-wrap gap-2'>
                    {examplePrompts.map((example, index) => (
                      <Button
                        key={index}
                        variant='outline'
                        size='sm'
                        onClick={() => applyExamplePrompt(example)}
                        className='text-xs'
                      >
                        {example.length > 30
                          ? example.substring(0, 30) + "..."
                          : example}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <Alert variant='destructive'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Loading State */}
              {isGenerating && (
                <div className='flex flex-col items-center justify-center py-12 border border-dashed rounded-lg'>
                  <div className='relative w-32 h-32 mb-4'>
                    <div className='absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg opacity-20 animate-pulse'></div>
                    <div className='absolute inset-0 flex items-center justify-center'>
                      <Loader2 className='h-12 w-12 animate-spin text-primary' />
                    </div>
                  </div>
                  <p className='text-center text-lg font-medium'>
                    Creating your masterpiece...
                  </p>
                  <p className='text-center text-sm text-muted-foreground mt-2'>
                    This may take up to 30 seconds
                  </p>
                </div>
              )}

              {/* Generated Image */}
              {generatedImage && !isGenerating && (
                <div className='mt-6 border rounded-lg p-4'>
                  <h3 className='text-lg font-medium mb-4 text-center'>
                    Your Generated Image
                  </h3>
                  <div className='relative aspect-square max-w-xl mx-auto border rounded-md overflow-hidden shadow-lg'>
                    <Image
                      src={generatedImage}
                      alt='Generated image'
                      fill
                      className='object-contain'
                      priority
                    />
                  </div>

                  {textResponse && (
                    <div className='mt-6 p-4 bg-muted rounded-md'>
                      <h4 className='font-medium mb-2'>AI Commentary:</h4>
                      <p className='text-sm'>{textResponse}</p>
                    </div>
                  )}

                  <div className='mt-6 flex justify-center gap-4'>
                    <Button
                      variant='outline'
                      onClick={() => {
                        const link = document.createElement("a");
                        link.href = generatedImage;
                        link.download = `bk-zen-vibe-${Date.now()}.png`;
                        link.click();
                      }}
                    >
                      <Download className='h-4 w-4 mr-2' />
                      Download Image
                    </Button>
                    <Button
                      variant='outline'
                      onClick={() => {
                        setGeneratedImage(null);
                        setTextResponse("");
                      }}
                    >
                      <RefreshCw className='h-4 w-4 mr-2' />
                      Create Another
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={generateImage}
                disabled={isGenerating || !prompt.trim()}
                className='w-full'
                size='lg'
              >
                {isGenerating ? (
                  <>
                    <Loader2 className='mr-2 h-5 w-5 animate-spin' />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className='mr-2 h-5 w-5' />
                    Generate Image
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value='gallery' className='mt-0'>
          <Card className='border-t-0 rounded-tl-none rounded-tr-none'>
            <CardHeader>
              <CardTitle>Your Image Gallery</CardTitle>
              <CardDescription>
                View and download your previously generated images
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <Alert className='mb-4'>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {imageHistory.length === 0 ? (
                <div className='text-center py-12 border border-dashed rounded-lg'>
                  <ImageIcon className='h-12 w-12 mx-auto text-muted-foreground mb-4' />
                  <h3 className='text-lg font-medium'>No images yet</h3>
                  <p className='text-sm text-muted-foreground mt-2'>
                    Generate your first image to see it here
                  </p>
                  <Button
                    variant='outline'
                    className='mt-4'
                    onClick={() => setActiveTab("create")}
                  >
                    Create Your First Image
                  </Button>
                </div>
              ) : (
                <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
                  {imageHistory.map((image, index) => (
                    <div
                      key={index}
                      className='border rounded-lg overflow-hidden flex flex-col'
                    >
                      <div className='relative aspect-square group'>
                        <Image
                          src={image.imageUrl}
                          alt={`Generated image ${index + 1}`}
                          fill
                          className='object-cover'
                        />
                        <div className='absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center'>
                          <div className='flex gap-2'>
                            <Button
                              variant='secondary'
                              size='icon'
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = image.imageUrl;
                                link.download = `bk-zen-vibe-${Date.now()}.png`;
                                link.click();
                              }}
                              className='h-8 w-8'
                            >
                              <Download className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='secondary'
                              size='icon'
                              onClick={() => {
                                setPrompt(image.prompt);
                                setActiveTab("create");
                              }}
                              className='h-8 w-8'
                            >
                              <RefreshCw className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='destructive'
                              size='icon'
                              onClick={() => deleteImage(index)}
                              className='h-8 w-8'
                            >
                              <Trash2 className='h-4 w-4' />
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className='p-3 bg-muted/50'>
                        <p className='text-xs truncate mb-2'>{image.prompt}</p>
                        <div className='flex justify-between items-center'>
                          <Badge variant='outline' className='text-xs'>
                            {image.size}
                          </Badge>
                          <span className='text-xs text-muted-foreground'>
                            {image.timestamp.toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {imageHistory.length > 0 && (
                <div className='mt-6 flex justify-between items-center border-t pt-4'>
                  <div className='text-sm text-muted-foreground'>
                    {imageHistory.length}{" "}
                    {imageHistory.length === 1 ? "image" : "images"} in gallery
                  </div>
                  <div className='flex gap-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={downloadImageHistory}
                    >
                      <Download className='h-4 w-4 mr-2' />
                      Backup Gallery
                    </Button>
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => {
                        if (
                          window.confirm(
                            "Are you sure you want to clear all images from your gallery? This cannot be undone."
                          )
                        ) {
                          clearImageHistory();
                        }
                      }}
                    >
                      <X className='h-4 w-4 mr-2' />
                      Clear Gallery
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
