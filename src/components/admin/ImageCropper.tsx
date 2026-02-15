'use client'

import React, { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import getCroppedImg from '@/utils/cropImage'
import { Upload, X, Check, Pencil, Trash2 } from 'lucide-react'

interface ImageCropperProps {
  onImageCropped: (croppedImage: string) => void
  initialImage?: string
  aspectRatio?: number
}

const ImageCropper: React.FC<ImageCropperProps> = ({ onImageCropped, initialImage, aspectRatio = 1 }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const onCropChange = (crop: { x: number; y: number }) => {
    setCrop(crop)
  }

  const onZoomChange = (zoom: number) => {
    setZoom(zoom)
  }

  const handleFile = async (file: File) => {
    const imageDataUrl = await readFile(file)
    setImageSrc(imageDataUrl)
    setIsEditing(true)
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFile(e.target.files[0])
    }
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        await handleFile(file)
      }
    }
  }

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.addEventListener('load', () => resolve(reader.result as string))
      reader.readAsDataURL(file)
    })
  }

  const onCropCompleteCallback = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const showCroppedImage = useCallback(async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels)
        if (croppedImage) {
          onImageCropped(croppedImage)
          setIsEditing(false)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [imageSrc, croppedAreaPixels, onImageCropped])

  const handleCancelEdit = () => {
    setIsEditing(false)
    setImageSrc(null)
  }

  const handleEditExisting = () => {
    if (initialImage) {
        setImageSrc(initialImage)
        setIsEditing(true)
    }
  }

  const handleRemoveImage = () => {
    if (confirm('Are you sure you want to remove this image?')) {
        onImageCropped('')
    }
  }

  // VIEW MODE (Static Image)
  if (initialImage && !isEditing) {
    return (
        <div className="relative w-full h-full group">
            <img 
                src={initialImage} 
                crossOrigin="anonymous"
                alt="Character Preview" 
                className="w-full h-full object-cover rounded-lg border-2 border-zinc-800"
            />
            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 rounded-lg">
                <button 
                    type="button"
                    onClick={handleEditExisting}
                    className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-500 transition-transform hover:scale-110"
                    title="Edit Crop"
                >
                    <Pencil size={20} />
                </button>
                <button 
                    type="button"
                    onClick={handleRemoveImage}
                    className="p-3 bg-red-600 rounded-full text-white hover:bg-red-500 transition-transform hover:scale-110"
                    title="Remove Image"
                >
                    <Trash2 size={20} />
                </button>
            </div>
        </div>
    )
  }

  // EDIT MODE (Cropper)
  if (isEditing && imageSrc) {
    return (
        <div className="flex flex-col gap-4 h-full">
          <div className="relative w-full flex-1 min-h-[300px] bg-black rounded-lg overflow-hidden border border-zinc-700">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onCropComplete={onCropCompleteCallback}
              onZoomChange={onZoomChange}
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-4 z-20">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="p-3 bg-red-600 rounded-full hover:bg-red-700 transition-colors shadow-lg border border-red-400"
                title="Cancel"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <button
                type="button"
                onClick={showCroppedImage}
                className="p-3 bg-green-600 rounded-full hover:bg-green-700 transition-colors shadow-lg animate-pulse border border-green-400"
                title="Apply Crop"
              >
                <Check className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4 px-2">
            <span className="text-xs font-bold text-zinc-500 uppercase">Zoom</span>
            <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="flex-1 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
          </div>
        </div>
      )
  }

  // UPLOAD MODE
  return (
    <div 
      className={`flex flex-col items-center justify-center w-full h-full border-2 border-dashed rounded-lg transition-all cursor-pointer bg-zinc-900/50 min-h-[200px]
        ${isDragging ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-700 hover:border-zinc-500 hover:bg-zinc-800'}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <label className="cursor-pointer flex flex-col items-center w-full h-full justify-center p-4 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Upload className={`w-8 h-8 transition-colors ${isDragging ? 'text-blue-400' : 'text-zinc-500'}`} />
        </div>
        <span className="font-bold text-zinc-300 text-sm">Click to Upload</span>
        <span className="text-xs text-zinc-500 mt-1">or drag and drop</span>
        <input type="file" onChange={onFileChange} accept="image/*" className="hidden" />
      </label>
    </div>
  )
}

export default ImageCropper
