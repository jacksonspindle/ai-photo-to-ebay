import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, Reorder, AnimatePresence } from 'framer-motion'

export default function PhotoUpload({ uploadedImages, setUploadedImages, onAnalyze, isAnalyzing }) {
  const [dragActive, setDragActive] = useState(false)
  const [dragOverMain, setDragOverMain] = useState(false)

  const onDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.slice(0, 5) // Limit to 5 files
    
    const imagePromises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          resolve({
            file,
            preview: e.target.result,
            name: file.name,
            size: file.size,
            id: Date.now() + Math.random() // Unique ID for each image
          })
        }
        reader.readAsDataURL(file)
      })
    })

    Promise.all(imagePromises).then(newImages => {
      const totalImages = [...uploadedImages, ...newImages].slice(0, 5) // Ensure max 5 total
      setUploadedImages(totalImages)
      
      // Auto-trigger analysis after images upload (only send first image)
      setTimeout(() => {
        onAnalyze(totalImages[0]) // Only send the first image for analysis
      }, 100)
    })
  }, [uploadedImages, setUploadedImages, onAnalyze])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB per file
    multiple: true,
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false)
  })

  const handleCameraCapture = () => {
    // Mobile camera capture via input[type="file"]
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.capture = 'environment' // Use back camera by default
    input.multiple = true
    input.onchange = (e) => {
      const files = Array.from(e.target.files)
      if (files.length > 0) {
        onDrop(files)
      }
    }
    input.click()
  }

  const handleRemoveImage = (imageId) => {
    const filteredImages = uploadedImages.filter(img => img.id !== imageId)
    setUploadedImages(filteredImages)
  }

  const handleRemoveAll = () => {
    setUploadedImages([])
  }

  const handleReorder = (newOrder) => {
    setUploadedImages(newOrder)
    
    // If the first image changed, re-analyze
    if (newOrder[0] && newOrder[0].id !== uploadedImages[0]?.id) {
      setTimeout(() => {
        onAnalyze(newOrder[0])
      }, 100)
    }
  }

  const handleMoveToMain = (imageId) => {
    const imageIndex = uploadedImages.findIndex(img => img.id === imageId)
    if (imageIndex > 0) {
      const newImages = [...uploadedImages]
      const [selectedImage] = newImages.splice(imageIndex, 1)
      newImages.unshift(selectedImage)
      
      setUploadedImages(newImages)
      setTimeout(() => {
        onAnalyze(newImages[0])
      }, 100)
    }
  }

  // Split images into main and thumbnails
  const mainImage = uploadedImages[0]
  const thumbnailImages = uploadedImages.slice(1)

  return (
    <div className="glass-card p-4 flex flex-col h-full">
      {uploadedImages.length === 0 ? (
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Drag and Drop Zone */}
          <motion.div
            {...getRootProps()}
            className={`
              relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer
              flex-1 flex flex-col justify-center
              ${isDragActive || dragActive 
                ? 'border-blue-400/50 bg-blue-500/10 glow-blue' 
                : 'border-white/20 hover:border-purple-400/50 hover:bg-purple-500/10 hover:glow-purple'
              }
            `}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <input {...getInputProps()} />
            
            {/* Upload Icon */}
            <motion.div 
              className="mb-4"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
            >
              <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
            </motion.div>
            
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-xl font-semibold text-white">
                {isDragActive ? 'Drop your photos here' : 'Upload photos'}
              </p>
              <p className="text-slate-300">
                Drag & drop or tap to select up to 5 photos
              </p>
              <p className="text-xs text-slate-400">
                JPG, PNG, WEBP up to 10MB each
              </p>
            </motion.div>
          </motion.div>

          {/* Mobile Camera Button */}
          <motion.div 
            className="mt-4 flex flex-col space-y-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={handleCameraCapture}
              className="btn btn-primary w-full haptic-medium flex items-center justify-center space-x-3"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-lg font-medium">Take Photos</span>
            </motion.button>
            
            <div className="text-center">
              <p className="text-sm text-slate-300 flex items-center justify-center space-x-2">
                <span>💡</span>
                <span>Best results: good lighting, clear object view</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <motion.div 
          className="flex flex-col h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with count and remove all button */}
          <motion.div 
            className="flex items-center justify-between mb-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <motion.span 
              className="text-sm font-medium text-slate-300"
              key={uploadedImages.length}
              initial={{ scale: 1.1 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''} uploaded
            </motion.span>
            <div className="flex items-center space-x-3">
              <motion.span 
                className="text-xs text-slate-400 opacity-70"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Drag to reorder
              </motion.span>
              <motion.button
                onClick={handleRemoveAll}
                className="text-xs text-red-400 hover:text-red-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Remove all
              </motion.button>
            </div>
          </motion.div>

          {/* Image Gallery - Takes most of the space */}
          <div className="flex-1 flex flex-col">
            {/* Main Image */}
            <motion.div 
              className={`relative rounded-2xl border border-white/10 bg-white/5 p-2 mb-4 ${
                dragOverMain ? 'border-blue-400/50 bg-blue-500/10 shadow-2xl shadow-blue-500/20' : ''
              }`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.02 }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverMain(true)
              }}
              onDragLeave={() => setDragOverMain(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOverMain(false)
                const imageId = e.dataTransfer.getData('imageId')
                if (imageId) {
                  handleMoveToMain(imageId)
                }
              }}
            >
              <motion.img
                src={mainImage.preview}
                alt="Main uploaded image"
                className="w-full h-full max-h-64 object-contain rounded-xl"
                layoutId={`image-${mainImage.id}`}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              
              {/* Remove Button for main image */}
              <motion.button
                onClick={() => handleRemoveImage(mainImage.id)}
                className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm text-white p-2 rounded-full shadow-lg border border-white/20 z-10"
                whileHover={{ scale: 1.1, backgroundColor: "rgb(239 68 68)" }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, type: "spring" }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
              
              {/* Drop indicator for main image */}
              <AnimatePresence>
                {dragOverMain && (
                  <motion.div 
                    className="absolute inset-0 rounded-xl border-2 border-blue-400 bg-blue-500/20 flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <motion.div 
                      className="bg-blue-600/80 backdrop-blur-sm px-4 py-2 rounded-full border border-blue-300/30"
                      animate={{ y: [-2, 2, -2] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      <span className="text-blue-100 font-medium text-sm">Drop to make main image</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Additional Images Thumbnails */}
            {thumbnailImages.length > 0 && (
              <motion.div 
                className="flex justify-center space-x-3 overflow-x-auto pb-3 pt-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Reorder.Group 
                  axis="x" 
                  values={thumbnailImages} 
                  onReorder={(newOrder) => handleReorder([mainImage, ...newOrder])}
                  className="flex space-x-3"
                >
                  <AnimatePresence>
                    {thumbnailImages.map((image, index) => (
                      <Reorder.Item 
                        key={image.id} 
                        value={image}
                        className="relative flex-shrink-0"
                        dragElastic={0.1}
                        whileDrag={{ 
                          scale: 1.1, 
                          rotate: 5, 
                          zIndex: 20,
                          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                        }}
                        initial={{ opacity: 0, scale: 0.8, y: 20, rotate: 0 }}
                        animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -20, rotate: 0 }}
                        transition={{ 
                          type: "spring", 
                          stiffness: 300, 
                          damping: 25,
                          delay: index * 0.1 
                        }}
                        onDragStart={(e) => {
                          e.dataTransfer?.setData('imageId', image.id)
                        }}
                      >
                        <motion.div 
                          className="w-20 h-20 rounded-lg border border-white/10 bg-white/5 p-1 cursor-grab active:cursor-grabbing"
                          whileHover={{ 
                            scale: 1.05, 
                            borderColor: "rgba(255, 255, 255, 0.2)",
                            backgroundColor: "rgba(255, 255, 255, 0.1)"
                          }}
                          layoutId={`container-${image.id}`}
                        >
                          <motion.img
                            src={image.preview}
                            alt={`Additional image ${index + 2}`}
                            className="w-full h-full object-contain rounded-md pointer-events-none"
                            layoutId={`image-${image.id}`}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        </motion.div>
                        
                        {/* Remove button for thumbnail */}
                        <motion.button
                          onClick={() => handleRemoveImage(image.id)}
                          className="absolute -top-1 -right-1 bg-red-500/90 text-white p-1.5 rounded-full shadow-md border border-white/20 z-10"
                          whileHover={{ scale: 1.1, backgroundColor: "rgb(239 68 68)" }}
                          whileTap={{ scale: 0.95 }}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.4 + index * 0.1, type: "spring" }}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </motion.button>
                      </Reorder.Item>
                    ))}
                  </AnimatePresence>
                </Reorder.Group>
                
                {/* Add more button if less than 5 */}
                {uploadedImages.length < 5 && (
                  <motion.div
                    {...getRootProps()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-white/20 hover:border-blue-400/50 flex items-center justify-center cursor-pointer bg-white/5 hover:bg-blue-500/10"
                    whileHover={{ scale: 1.05, borderColor: "rgba(59, 130, 246, 0.5)" }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                  >
                    <input {...getInputProps()} />
                    <motion.svg 
                      className="w-6 h-6 text-slate-400" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      whileHover={{ rotate: 90 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </motion.svg>
                  </motion.div>
                )}
              </motion.div>
            )}
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {isAnalyzing && (
              <motion.div 
                className="mt-3 p-3 bg-blue-500/10 backdrop-blur-sm rounded-2xl border border-blue-400/30"
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.9 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center justify-center space-x-3">
                  <motion.svg 
                    className="w-5 h-5 text-blue-400" 
                    fill="none" 
                    viewBox="0 0 24 24"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </motion.svg>
                  <span className="text-sm font-medium text-blue-300">Analyzing with AI...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  )
}