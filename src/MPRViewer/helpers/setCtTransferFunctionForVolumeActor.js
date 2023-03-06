const windowWidth = 1500
const windowCenter = -400

const lower = windowCenter - windowWidth / 2.0
const upper = windowCenter + windowWidth / 2.0

const ctVoiRange = { lower, upper }

export default function setCtTransferFunctionForVolumeActor({ volumeActor }) {
  volumeActor.getProperty().getRGBTransferFunction(0).setMappingRange(lower, upper)
}

export { ctVoiRange }
