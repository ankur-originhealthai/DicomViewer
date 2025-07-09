<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import {
    RenderingEngine,
    Enums,
    imageLoader,
    metaData,
    StackViewport,
    init as cornerstoneCoreInit,
} from "@cornerstonejs/core";

import {
    init as cornerstoneToolsInit,
    ToolGroupManager,
    Enums as csToolsEnums,
    addTool,
    PanTool,
    ZoomTool,
    WindowLevelTool,
    LengthTool,
    RectangleROITool,
    EllipticalROITool,
    AngleTool,
    annotation,
    LabelTool,
} from "@cornerstonejs/tools";
import * as cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader';
import dicomParser from 'dicom-parser';
import { init as dicomLoaderInit } from "@cornerstonejs/dicom-image-loader";
import hardcodedMetaDataProvider from "../utils/hardcodedMetaDataProvider";


import { useLabelTool } from '~/customs/useLabelTool'
import { useMagnifier } from '~/customs/useMagnifier'
import ViewportOverlay from '~/components/ViewportOverlay.vue'
import LabelInputOverlay from '~/components/LabelInputOverlay.vue'
import { captureDicom } from "~/components/CaptureDicom.vue";
import { wadouri } from "@cornerstonejs/dicom-image-loader";

// Constants
const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const toolGroupId = "myToolGroup";
const annotationGroupId = "annotationgroupid";
// Refs


const isPlaying = ref<boolean>(false);
const isMagnifyVisible = ref(false);
const speed = ref(1);
const playIntervalRef = ref<NodeJS.Timeout | null>(null);
const cornerstoneElement = ref<any>(null);
const zoomFactor = ref(2);
const bookmarkarray = ref<number[]>([]);
const toolusedonframe = ref<string[]>([]);

const undostack: any = [];
const redostack: any = [];
const elementRef = ref<HTMLDivElement | null>(null);
const renderingEngineRef = ref<RenderingEngine | null>(null);
const currentFile = ref<Blob | null>(null);
const loaded = ref(false);
const frameCount = ref(0);
const frameIndex = ref(0);
const isBookmarked = ref(false)
const hideAnnotation = ref(false)
// Handle file upload input

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        currentFile.value = file;
    }

    console.log(file)
}

const handleFlip = (type: string) => {
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;

    const { flipVertical, flipHorizontal } = viewport.getCamera();

    viewport.setCamera({
        flipHorizontal: type === "HFlip" ? !flipHorizontal : flipHorizontal,
        flipVertical: type === "VFlip" ? !flipVertical : flipVertical,
    });
    viewport.render();
};



onMounted(async () => {
    cornerstoneDICOMImageLoader.wadouri.fileManager.add(currentFile.value as File)
    //cornerstoneDICOMImageLoader.external.dicomParser = dicomParser;
    var config = {
        maxWebWorkers: navigator.hardwareConcurrency || 1,
        startWebWorkersOnDemand: true,
        // Add other configurations as needed, e.g., for codecs or decoders
        // webWorkerPath: '/path/to/web-worker.js',
        // codecsPath: '/path/to/codecs.js',
    };
    //cornerstoneDICOMImageLoader.webWorkerManager.initialize(config);

    await cornerstoneCoreInit();

    await cornerstoneToolsInit();


    //await dicomLoaderInit();

    const element = document.getElementById("cornerstoneDiv");
    cornerstoneElement.value = (element);




})

// Watch for file changes
watch(currentFile, async () => {
    try {



        metaData.addProvider(
            (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
            10000
        );
        const element = elementRef.value;
        if (!element || !currentFile.value) return;

        const renderingEngine = new RenderingEngine(renderingEngineId);
        renderingEngineRef.value = renderingEngine;
        renderingEngine.setViewports([
            {
                viewportId,
                type: Enums.ViewportType.STACK,
                element,
            },
        ]);
        const viewport = renderingEngine.getViewport(viewportId) as StackViewport;

        const baseImageId = wadouri.fileManager.add(currentFile.value);
        console.log(baseImageId)
        console.log("not loaded yet")

        const imageData = await imageLoader.loadImage(baseImageId);
        console.log("Image loaded successfully:", imageData);

        const metadata = metaData.get("multiframeModule", baseImageId);
        const numberOfFrames = metadata?.NumberOfFrames || 1;
        frameCount.value = numberOfFrames;
        console.log("no. of frames", frameCount.value)

        if (numberOfFrames > 1) {
            const imageIds = numberOfFrames > 1
                ? Array.from({ length: numberOfFrames }, (_, i) => `${baseImageId}?frame=${i + 1}`)
                : [baseImageId];

            await viewport.setStack(imageIds);
        }
        else if (!numberOfFrames) {
            await viewport.setStack([baseImageId]);
        }
        viewport.setImageIdIndex(0);
        viewport.render();

        [
            PanTool,
            ZoomTool,
            WindowLevelTool,
            LengthTool,
            RectangleROITool,
            EllipticalROITool,
            AngleTool,
            LabelTool,
        ].forEach(addTool);

        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        if (!toolGroup) return;

        [
            PanTool,
            ZoomTool,
            WindowLevelTool,
            LengthTool,
            RectangleROITool,
            EllipticalROITool,
            AngleTool,
            LabelTool,
        ].forEach((Tool) => {
            toolGroup.addTool(Tool.toolName);
        });

        toolGroup.addViewport(viewportId, renderingEngineId);
        annotation.config.style.setToolGroupToolStyles(toolGroupId, {
            global: {
                lineWidth: "3",
                lineDash: "4,2",
                color: "#FFC700",
                colorHighlighted: "#FFC700",
                colorSelected: "#FFC700",
                colorLocked: "#FFC700",
                textBoxFontFamily: "Roboto",
                textBoxColorHighlighted: "#FFC700",
                textBoxColorSelected: "#FFC700",
                textBoxColorLocked: "#FFC700",
                textBoxColor: "#FFC700"

            },
        });
        toolGroup.addViewport(viewportId, renderingEngineId);
        loaded.value = true;
    } catch (error) {
        console.error("DICOM load/render error:", error);
    }
});


const {
    labelInputVisible,
    labelInputCoords,
    labelInputValue,
    setLabelInputValue,
    onLabelSubmit,
    setLabelInputVisible,
    prevToolRef,
    onLabelCancel,
} = useLabelTool(
    cornerstoneElement,
    renderingEngineRef,
    viewportId,
    toolGroupId,
    isMagnifyVisible
);

useMagnifier(
    isMagnifyVisible,
    elementRef,
    renderingEngineRef,
    viewportId,
    zoomFactor
);

watch([isPlaying, speed], ([playing, spd]) => {

    if (playIntervalRef.value) {
        clearInterval(playIntervalRef.value);
        playIntervalRef.value = null;
    }
    if (!playing || frameCount.value <= 1) return;
    playIntervalRef.value = setInterval(() => {
        const nextIndex = frameIndex.value + 1;

        if (nextIndex >= frameCount.value) {
            isPlaying.value = false;
            frameIndex.value = 0;
            return;
        }
        const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
        if (viewport) {
            viewport.setImageIdIndex(nextIndex);
            viewport.render();
        }
        frameIndex.value = nextIndex;
    }, 1000 / 30 / spd);
}, { immediate: true });
onBeforeUnmount(() => {
    if (playIntervalRef.value) {
        clearInterval(playIntervalRef.value);
        playIntervalRef.value = null;
    }
});
// Controls
const handlePlay = () => {
    isPlaying.value = true;
    console.log("click")
};
const handlePause = () => {
    isPlaying.value = false;
};
const handleSpeedChange = (num: number) => {
    speed.value = num;
};

const handleToolChange = (selectedToolName: string) => {
    prevToolRef.value = selectedToolName;
    if (["Length", "RectangleROI", "EllipticalROI", "Angle", "Label"].includes(selectedToolName) && isMagnifyVisible.value === false) {
        isMagnifyVisible.value = (true);
    } else if (
        isMagnifyVisible &&
        ["Pan", "Zoom", "WindowLevel"].includes(selectedToolName)
    ) {
        isMagnifyVisible.value = (false);
    }
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
    if (!toolGroup) return;
    const allTools = [
        PanTool.toolName,
        ZoomTool.toolName,
        WindowLevelTool.toolName,
        LengthTool.toolName,
        RectangleROITool.toolName,
        EllipticalROITool.toolName,
        AngleTool.toolName,
        LabelTool.toolName,
    ];
    allTools.forEach((toolName) => {
        if (toolName === selectedToolName) {
            toolGroup.setToolActive(toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            });
        } else {
            toolGroup.setToolPassive(toolName);
        }
    });
    toolusedonframe.value = toolusedonframe.value.includes(selectedToolName) ? toolusedonframe.value : [...toolusedonframe.value, selectedToolName]
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    viewport?.render();
};

const trackNewAnnotations = () => {
    const annotations = annotation.state.getAllAnnotations();
    annotations.forEach((a) => {
        undostack.push({
            uid: a.annotationUID,
            annotations: a,
        });
    });
};

const playbackButtons = [
    { name: "mdi:skip-backward", onClick: () => handleFrameChange(frameIndex.value - 1), label: 'Previous Frame' },
    { name: "mdi:play", onClick: handlePlay, label: 'Play' },
    { name: "mdi:pause", onClick: handlePause, label: 'Pause' },
    { name: "mdi:skip-forward", onClick: () => handleFrameChange(frameIndex.value + 1), label: 'Next Frame' },
];

const undo = () => {
    trackNewAnnotations();
    if (undostack.length === 0) return;
    const last = undostack.pop();
    annotation.state.removeAnnotation(last.uid);
    redostack.push({
        uid: last.uid,
        ann: last.annotations,
    });
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;
    viewport.render();
};

const redo = () => {
    if (redostack.length === 0) return;
    const lastRedo = redostack.pop();
    annotation.state.addAnnotation(lastRedo.ann, annotationGroupId);
    undostack.push({
        uid: lastRedo.ann.annotationUID,
        annotation: lastRedo.ann,
    });
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;
    viewport.render();
};

const clear = () => {
    annotation.state.removeAllAnnotations();
    bookmarkarray.value = ([]);
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;
    viewport.render();
};


const bookmark = (frameNumber: number) => {
    console.log("called ")
    const bookmarkedIndex = frameNumber - 1;
    console.log(bookmarkedIndex)
    if (!bookmarkarray.value.includes(bookmarkedIndex)) {
        bookmarkarray.value = [...bookmarkarray.value, bookmarkedIndex];
    }
    isBookmarked.value = true;

    console.log(isBookmarked.value)

};

watch(frameIndex, () => {
    const ann = annotation.state.getAllAnnotations();
    ann.forEach((elem: any) => {
        const imageId = elem.metadata?.referencedImageId;
        const frameMatch = imageId?.match(/frame=(\d+)/);
        if (frameMatch) {
            const frameNumber = parseInt(frameMatch[1]);
            //console.log(frameNumber)
            if (frameNumber) bookmark(frameNumber);
        }
    });
});

const toggleAnnotations = () => {
    const ann = annotation.state.getAllAnnotations();
    const val = hideAnnotation.value
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;
    console.log(val)
    if (val == true) {
        annotation.visibility.showAllAnnotations();

    }
    else {
        ann.map((a) => {
            if (a.annotationUID) {
                annotation.visibility.setAnnotationVisibility(a.annotationUID, val);

            }
        });
    }
    viewport.render()
    hideAnnotation.value = !val;
};
const getBookmarkLeft = (bookmarkedIndex: number, total: number) => {
    if (bookmarkedIndex == null || total <= 1) return '0px';
    const sliderIndex = bookmarkedIndex;
    const percent = sliderIndex / (total - 1);
    const pixelValue = 19 + percent * 850;
    console.log(`pixel value ${pixelValue} for frame ${sliderIndex}`);
    return `${pixelValue - 5}px`;
};

const handleFrameChange = (index: number) => {
    const viewport = renderingEngineRef.value?.getViewport(
        viewportId
    ) as StackViewport;
    if (index >= 0 && index < frameCount.value) {
        viewport.setImageIdIndex(index);
        viewport.render();
        frameIndex.value = (index);
    }
};


const toolList = [
    PanTool,
    ZoomTool,
    WindowLevelTool,
    LengthTool,
    RectangleROITool,
    EllipticalROITool,
    AngleTool,
];


</script>

<template>
    <div
        class="w-screen h-screen bg-black text-white grid grid-cols-[1fr_250px] grid-rows-[auto_1fr_auto] gap-0 font-sans overflow-hidden">
        <!-- Toolbar (Top Row, Full Width) -->
        <div
            class="col-span-2 flex flex-wrap items-center justify-center gap-2 p-3 border-b border-gray-700 bg-neutral-900">
            <button v-for="Tool in toolList" :key="Tool.toolName" @click="handleToolChange(Tool.toolName)"
                class="tool-btn">
                {{ Tool.toolName }}
            </button>
            <button @click="handleFlip('VFlip')" class="tool-btn">V Flip</button>
            <button @click="handleFlip('HFlip')" class="tool-btn">H Flip</button>
            <button @click="undo" class="tool-btn">Undo</button>
            <button @click="redo" class="tool-btn">Redo</button>
            <button @click="clear" class="tool-btn">Clear</button>
            <button @click="toggleAnnotations" class="bg-blue-500 text-white px-3 py-1 rounded">
                {{ hideAnnotation ? 'Show Annotations' : 'Hide Annotations' }}
            </button>
            <button @click="captureDicom(elementRef, frameIndex)" class="tool-btn">Capture</button>
        </div>

        <div class="relative w-full h-full bg-black border-r border-gray-800">
            <div ref="elementRef" id="cornerstoneDiv" class="w-full h-full" />
            <ViewportOverlay :elementRef="elementRef" :isMagnifyVisible="isMagnifyVisible" :zoomFactor="zoomFactor"
                @update:zoomFactor="(val) => (zoomFactor = val)" />

        </div>

        <LabelInputOverlay :visible="labelInputVisible" :coords="labelInputCoords" :value="labelInputValue"
            :onChange="setLabelInputValue" :onSubmit="onLabelSubmit" :onClose="onLabelCancel" />

        <div class="h-full flex flex-col justify-between p-4 bg-neutral-900">
            <div>
                <h2 class="text-lg font-bold mb-3">Upload DICOM</h2>
                <input type="file" accept=".dcm" @change="handleFileChange"
                    class="mb-6 text-white bg-gray-800 px-3 py-2 rounded w-full" />
            </div>
            <div>
                <h2 class="text-lg font-bold mb-3">Measurements</h2>
                <button @click="() => console.log(annotation.state.getAllAnnotations())"
                    class="tool-btn w-full bg-blue-600 hover:bg-blue-500">
                    Get Measurements
                </button>
            </div>
        </div>

        <div class="col-span-2 bg-neutral-900 border-t border-gray-700 px-6 py-3">
            <input type="range" :min="0" :max="frameCount > 1 ? frameCount - 1 : 0"
                :value="frameCount > 1 ? frameIndex : 0"
                @input="(e) => handleFrameChange(Number((e.target as HTMLInputElement).value))"
                :disabled="frameCount <= 1" class="w-full h-2 rounded bg-gray-700 cursor-pointer appearance-none" />


            <div v-if="isBookmarked" class="relative w-full -mt-3 -mb-1">
                <div v-for="(b, i) in bookmarkarray" :key="i" @click="handleFrameChange(b)"
                    class="absolute px-1 mx-1 w-1 h-3 bg-yellow-300 rounded-full border-2 border-yellow-600 shadow-md cursor-pointer hover:scale-110 transition-transform duration-150"
                    :style="{ left: `${(b / (frameCount - 1)) * 100}%`, top: '-4px', transform: 'translateX(-50%)' }"
                    :title="`Go to frame ${b + 1}`" />
            </div>
        </div>
        <div class="flex justify-between items-center gap-4 my-2">

            <div class="text-sm text-gray-400 w-24 text-left">
                {{ frameCount > 1
                    ? `${String(Math.floor(frameIndex / 30)).padStart(2, '0')}:${String(frameIndex % 30).padStart(2, '0')}`
                    : '00:00'
                }}
            </div>

            <div class="flex items-center gap-2">
                <button v-for="{ name, onClick, label } in playbackButtons" :key="label" @click="onClick"
                    :disabled="frameCount <= 1" class="tool-btn w-10 h-10 flex items-center justify-center">
                    <Icon :name="name" />
                </button>
            </div>

            <select @change="(e) => handleSpeedChange(Number((e.target as HTMLSelectElement).value))"
                class="h-10 bg-gray-900 border border-gray-700 rounded-md text-white hover:bg-gray-800 w-24"
                default="1">
                <option value="0.5">0.5x</option>
                <option value="1" selected>1x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2x</option>

            </select>
        </div>
    </div>

</template>
