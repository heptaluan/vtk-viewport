import vtkImageData from 'vtk.js/Sources/Common/DataModel/ImageData';
import vtkDataArray from 'vtk.js/Sources/Common/Core/DataArray';
import { vec3 } from 'gl-matrix';

export async function _getSeriesMetaDataMap(seriesImageIds) {
  const metaDataMap = new Map();
  for (let i = 0; i < seriesImageIds.length; i++) {
    const imageId = seriesImageIds[i];
    const metaData = await tryGetMetadataModuleAsync(
      'imagePlaneModule',
      imageId
    );
    metaDataMap.set(imageId, metaData);
  }

  return metaDataMap;
}

export async function tryGetMetadataModuleAsync(metadataModule, imageId) {
  // const imageUrl = getUrlForImageId(imageId);
  let imageMetadata = cornerstone.metaData.get(metadataModule, imageId);

  if (!imageMetadata) {
    await cornerstone.loadAndCacheImage(imageId);
    imageMetadata = cornerstone.metaData.get(metadataModule, imageId);
  }

  return imageMetadata;
}

export function crossVectors(a, b) {
  let ax = a.x || a[0];
  let ay = a.y || a[1];
  let az = a.z || a[2];

  let bx = b.x || b[0];
  let by = b.y || b[1];
  let bz = b.z || b[2];

  const x = ay * bz - az * by;
  const y = az * bx - ax * bz;
  const z = ax * by - ay * bx;

  return { x, y, z };
}

export function determineOrientation(v) {
  let axis;
  const oX = v.x < 0 ? 'R' : 'L';
  const oY = v.y < 0 ? 'A' : 'P';
  const oZ = v.z < 0 ? 'I' : 'S';

  const aX = Math.abs(v.x);
  const aY = Math.abs(v.y);
  const aZ = Math.abs(v.z);
  const obliqueThreshold = 0.8;
  if (aX > obliqueThreshold && aX > aY && aX > aZ) {
    axis = oX;
  } else if (aY > obliqueThreshold && aY > aX && aY > aZ) {
    axis = oY;
  } else if (aZ > obliqueThreshold && aZ > aX && aZ > aY) {
    axis = oZ;
  }

  return axis;
}

export function mean(array) {
  return sum(array) / array.length;
}

export function sum(array) {
  let sum = 0;
  for (let i = 0; i < array.length; i++) {
    sum += array[i];
  }
  return sum;
}

export function diff(array) {
  let resultArray = [];
  for (let i = 1; i < array.length; i++) {
    resultArray.push(array[i] - array[i - 1]);
  }
  return resultArray;
}

export function computeZAxis(orientation, metaData) {
  var ippArray = [];
  const xyzIndex = determineOrientationIndex(orientation);

  for (var value of metaData.values()) {
    let ipp = value.imagePositionPatient;
    if (xyzIndex === 0) {
      ippArray.push(ipp.x || ipp[0]);
    } else if (xyzIndex === 1) {
      ippArray.push(ipp.y || ipp[1]);
    } else {
      ippArray.push(ipp.z || ipp[2]);
    }
  }

  ippArray.sort(function(a, b) {
    return a - b;
  });
  const meanSpacing = mean(diff(ippArray));

  // Find origin from positions
  const originPositionAlongAcqAxis = ippArray[0];
  const originImagePlane = Array.from(metaData.values()).find(meta => {
    return meta.imagePositionPatient[xyzIndex] === originPositionAlongAcqAxis;
  });

  var obj = {
    spacing: meanSpacing,
    positions: ippArray,
    origin: originImagePlane.imagePositionPatient,
    xyzIndex,
  };
  return obj;
}

export function determineOrientationIndex(orientation) {
  var o = orientation;
  var index;
  switch (o) {
    case 'A':
    case 'P':
      index = 1;
      break;
    case 'L':
    case 'R':
      index = 0;
      break;
    case 'S':
    case 'I':
      index = 2;
      break;
    default:
      console.assert(false, ' OBLIQUE NOT SUPPORTED');
      break;
  }
  return index;
}

export function _calculateDimensions(metaDataMap) {
  const imagePlaneModule = metaDataMap.values().next().value;

  const { rowCosines, columnCosines } = imagePlaneModule;
  const crossProduct = crossVectors(columnCosines, rowCosines);
  const orientation = determineOrientation(crossProduct);
  const zAxis = computeZAxis(orientation, metaDataMap);

  const xSpacing = imagePlaneModule.columnPixelSpacing;
  const ySpacing = imagePlaneModule.rowPixelSpacing;
  const zSpacing = zAxis.spacing;
  const xVoxels = imagePlaneModule.columns;
  const yVoxels = imagePlaneModule.rows;
  const zVoxels = metaDataMap.size;

  // 3 === RGB?
  const multiComponent = imagePlaneModule.numberOfComponents > 1;

  return {
    dimensions: [xVoxels, yVoxels, zVoxels],
    orientation,
    multiComponent,
    spacing: [xSpacing, ySpacing, zSpacing],
    zAxis,
  };
}

export function bsearch(array, value, cmp) {
  let low = 0;
  let high = array.length - 1;

  let cmpResult;
  while (low <= high) {
    let mid = low + (((high - low) / 2) | 0); // avoid overflow when low + high > max for type
    cmpResult = cmp(array[mid], value);
    if (cmpResult < 0) {
      low = mid + 1;
    } else if (cmpResult > 0) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
}

export function realsApproximatelyEqual(a, b, eps = 0.00001) {
  return Math.abs(a - b) < eps;
}

export function compareReals(a, b, cmp) {
  let eq = realsApproximatelyEqual(a, b);
  if (eq === true) return 0;

  if (a < b) {
    return -1;
  }
  return 1;
}

export async function _getTypedPixelArray(imageId, dimensions) {
  const imagePixelModule = await tryGetMetadataModuleAsync(
    'imagePixelModule',
    imageId
  );
  const { bitsAllocated, pixelRepresentation } = imagePixelModule;
  const signed = pixelRepresentation === 1;

  if (bitsAllocated === 8) {
    if (signed) {
      throw new Error(
        '8 Bit signed images are not yet supported by this plugin.'
      );
    } else {
      throw new Error(
        '8 Bit unsigned images are not yet supported by this plugin.'
      );
    }
  }

  let typedPixelArray;
  if (bitsAllocated === 16) {
    // x, y, z
    typedPixelArray = signed
      ? new Int16Array(dimensions[0] * dimensions[1] * dimensions[2])
      : new Uint16Array(dimensions[0] * dimensions[1] * dimensions[2]);
  } else {
    throw new Error(`Unssuported bit: ${bitsAllocated}`);
  }

  return typedPixelArray;
}

export function getSliceIndex(zAxis, imagePositionPatient) {
  const x = imagePositionPatient.x || imagePositionPatient[0];
  const y = imagePositionPatient.y || imagePositionPatient[1];
  const z = imagePositionPatient.z || imagePositionPatient[2];

  let sliceIndex = 0;
  if (zAxis.xyzIndex === 0) {
    sliceIndex = bsearch(zAxis.positions, x, compareReals);
  } else if (zAxis.xyzIndex === 1) {
    sliceIndex = bsearch(zAxis.positions, y, compareReals);
  } else {
    sliceIndex = bsearch(zAxis.positions, z, compareReals);
  }

  return sliceIndex;
}

export function computeImageDataIncrements(imageData, numberOfComponents) {
  const datasetDefinition = imageData.get('extent', 'spacing', 'origin');
  const inc = [0, 0, 0];
  let incr = numberOfComponents;

  for (let idx = 0; idx < 3; ++idx) {
    inc[idx] = incr;
    incr *=
      datasetDefinition.extent[idx * 2 + 1] -
      datasetDefinition.extent[idx * 2] +
      1;
  }

  return inc;
}

export function computeIndex(extent, incs, xyz) {
  return (
    ((xyz[0] - extent[0]) * incs[0] +
      (xyz[1] - extent[2]) * incs[1] +
      (xyz[2] - extent[4]) * incs[2]) |
    0
  );
}

export function insertSlice(vtkVolume, pixelData, sliceIndex) {
  const datasetDefinition = vtkVolume.get('extent', 'spacing', 'origin');
  const scalars = vtkVolume.getPointData().getScalars();
  // TODO number of components.
  const increments = computeImageDataIncrements(vtkVolume, 1);
  const scalarData = scalars.getData();
  const indexXYZ = [0, 0, sliceIndex];
  let pixelIndex = 0;

  for (let row = 0; row <= datasetDefinition.extent[3]; row++) {
    indexXYZ[1] = row;
    for (let col = 0; col <= datasetDefinition.extent[1]; col++) {
      indexXYZ[0] = col;

      const destIdx = computeIndex(
        datasetDefinition.extent,
        increments,
        indexXYZ
      );
      scalarData[destIdx] = pixelData[pixelIndex++];
    }
  }
  vtkVolume.modified();
}

export async function _createVtkVolume(
  seriesImageIds,
  dimensions,
  spacing,
  zAxis
) {
  const vtkVolume = vtkImageData.newInstance();
  const typedPixelArray = await _getTypedPixelArray(
    seriesImageIds[0],
    dimensions
  );
  const scalarArray = vtkDataArray.newInstance({
    name: 'Pixels',
    numberOfComponents: 1,
    values: typedPixelArray,
  });

  // TODO: Is this a better place to set this?
  console.log('VOLUME ORIGIN: ', zAxis.origin);
  // Our recommended three-step method for
  // handling DICOM coordinates in VTK are to undo any vertical flip applied to the data by the reader, set the
  // origin to zero, and build the above 4×4 matrix from the DICOM metadata.
  // vtkVolume.setOrigin(zAxis.origin)
  vtkVolume.setOrigin([0, 0, 0]); // zMax * zPixelSpacing
  vtkVolume.setDimensions(dimensions);
  vtkVolume.setSpacing(spacing);
  vtkVolume.getPointData().setScalars(scalarArray);

  // Add our slices
  for (let i = 0; i < seriesImageIds.length; i++) {
    const imageId = seriesImageIds[i];
    // const imageUrl = getUrlForImageId(imageId);
    const image = await cornerstone.loadAndCacheImage(imageId);
    const { imagePositionPatient } = await tryGetMetadataModuleAsync(
      'imagePlaneModule',
      imageId
    );
    const sliceIndex = getSliceIndex(zAxis, imagePositionPatient);

    insertSlice(vtkVolume, image.getPixelData(), sliceIndex);

    // TODO: Inverting Slice Index: Vertical flips sagittal/coronal
    // const flipped = Math.abs(sliceIndex - seriesImageIds.length);
    // insertSlice(vtkVolume, image.getPixelData().reverse(), flipped);

    // TODO: .reverse() vertically flips axial
    // TODO: Flip x/y spacing because of flip?
    // insertSlice(vtkVolume, image.getPixelData().reverse(), sliceIndex);
  }

  // TODO: We can accidentally create multiple volumes if we try to create one
  // Before a request for the same series has completed.
  // (You'll notice this logs 3x -- one for each initial MPR canvas, but 0x after any load has finished)
  // console.log('~~~~~~~~~~ VTK VOLUME:', vtkVolume);
  return vtkVolume;
}

export function _getVolumeCenterIpp(vtkImageData) {
  const [x0, y0, z0] = vtkImageData.getOrigin();
  const [xSpacing, ySpacing, zSpacing] = vtkImageData.getSpacing();
  const [xMin, xMax, yMin, yMax, zMin, zMax] = vtkImageData.getExtent();

  const centerOfVolume = vec3.fromValues(
    x0 + xSpacing * 0.5 * (xMin + xMax),
    y0 + ySpacing * 0.5 * (yMin + yMax),
    z0 + zSpacing * 0.5 * (zMin + zMax)
  );

  return centerOfVolume;
}
