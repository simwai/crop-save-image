import path from 'node:path'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import axios from 'axios'
import sharp from 'sharp'

import { counters } from './db'
counters.set('cropImages', 0)
counters.set('downloadedImages', 0)

async function downloadFile(myUrl: string, downloadFolder: string | undefined = 'images/image-' + counters.get('downloadedImages') + '.jpg') {
  // Get the file name
  // The path of the downloaded file on our machine
  const localFilePath = path.join(__dirname, downloadFolder)
  const response = await axios({
    method: 'GET',
    url: myUrl,
    responseType: 'arraybuffer'
  })

  console.log(response.data)
  writeFileSync(localFilePath, response.data)
  console.log('Successfully downloaded file!')
  counters.inc('downloadedImages')
  console.log('Downloaded images', counters.get('downloadedImages'))
}

type Coordinates = { xStart: number, xEnd: number, yStart: number, yEnd: number }
type ExtractParameters = { left: number, top: number, width: number, height: number }

async function cropImage(imageUrl: string, coordinates: Coordinates, downloadFilePath: string = 'images/image-' + counters.get('cropImages') + '.jpg', cropFilePath = path.join(__dirname, 'images/crop-' + counters.get('cropImages') + '.jpeg')) {
  const outputPath = path.join(__dirname, 'images')
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath)
  }
  
  // Convert coordinates to extract parameters
  const extractParameters: ExtractParameters = { left: coordinates.xStart, top: coordinates.yStart, width: coordinates.xEnd - coordinates.xStart, height: coordinates.yEnd - coordinates.yStart }

  const localFilePath = path.join(__dirname, downloadFilePath)
  console.log('File path', localFilePath)

  //Download image
  await downloadFile(imageUrl)

  const imageMetadata = await sharp(localFilePath).metadata()
  console.log('Image size', imageMetadata)
  
  // Throw error when extractParameters are not correct
  if ((imageMetadata.width as number) < extractParameters.width || (imageMetadata.height as number) < extractParameters.height) {
    throw (new Error('Image is not big enough for the provided coordinates'))
  }

  sharp(localFilePath)
    .extract(extractParameters)
    .jpeg()
    .toFile(cropFilePath, error => { 
      if (error) console.error('Cropping failed\n', error) 
      counters.inc('cropImages')
  })
}

async function cropImages(urls: any[]) {
  for (const { url, coordinates } of urls) {
    await cropImage(url, coordinates)
  }
}

// TODO add file extension recognition in wrapping function
(async () => {
  const cropImageErrorHandler = (error: Error) => console.error('Crop image failed\n', error)
  await cropImage('http://www.usefulcraft.com/wp-content/uploads/2019/12/4knaruto-17-scaled.jpg', { xStart: 100, xEnd: 200, yStart: 100, yEnd: 200 })
  .catch(error => cropImageErrorHandler(error))
  
  const coordinates: Coordinates = { xStart: 100, xEnd: 300, yStart: 50, yEnd: 300}
  const urlData = [
    { url: 'https://www.modern-notoriety.com/wp-content/uploads/2019/03/coa.jpg', coordinates },
    { url: 'https://getwallpapers.com/wallpaper/full/a/f/6/1400334-most-popular-naruto-background-1920x1080.jpg', coordinates },
    { url: 'https://www.testedich.de/quiz28/picture/pic_1288807560_1.jpg', coordinates }
  ]
  await cropImages(urlData)
  .catch(error => cropImageErrorHandler(error))
})()

