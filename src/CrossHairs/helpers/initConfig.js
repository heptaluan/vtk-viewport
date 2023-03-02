import initProviders from './initProviders';
import initCornerstoneWADOImageLoader from './initCornerstoneWADOImageLoader';
import initVolumeLoader from './initVolumeLoader';
import { init as csRenderInit } from '@cornerstonejs/core';
import { init as csToolsInit } from '@cornerstonejs/tools';
import initCornerstone from './initCornerstone';

export default async function initConfig() {
  initProviders();
  initCornerstoneWADOImageLoader();
  initVolumeLoader();
  initCornerstone()
  await csRenderInit();
  await csToolsInit();
}
