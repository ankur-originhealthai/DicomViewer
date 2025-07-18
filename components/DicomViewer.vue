<script setup lang="ts">
import { onMounted, watch } from "vue";
import {
    RenderingEngine,
    Enums,
    imageLoader,
    metaData,
    StackViewport,
    init as cornerstoneCoreInit,
    eventTarget,

} from "@cornerstonejs/core";
import { annotation } from '@cornerstonejs/tools'
import { ref } from 'vue'
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
    LabelTool,


} from "@cornerstonejs/tools";
import hardcodedMetaDataProvider from "../utils/hardcodedMetaDataProvider";
import { useLabelTool } from '~/customs/useLabelTool'
import { useMagnifier } from '~/customs/useMagnifier'
import ViewportOverlay from '~/components/ViewportOverlay.vue'
import LabelInputOverlay from '~/components/LabelInputOverlay.vue'
import { captureDicom } from "./CaptureDicom.vue";
import { init as dicomLoaderInit, wadouri } from "@cornerstonejs/dicom-image-loader";
import { useLabelToolDrag } from "~/customs/useLabelToolDrag";
import { CustomLengthTool } from "~/customs/CustomLengthTool";
import { customangletool } from "~/customs/CustomAngleTool";
import { customellipse } from "~/customs/CustomEllipseTool";
import { CustomSplineROITool } from "~/customs/CustomSplineROITool";
import {customCobbAngleTool} from "~/customs/CustomCobbAngleTool"
import {custombidirectional} from "~/customs/CustomBiDirectionalTool"
const renderingEngineId = "myRenderingEngine";
const viewportId = "myViewport";
const toolGroupId = "myToolGroup";
const annotationGroupId = "annotationgroupid";

const isPlaying = ref<boolean>(false);
const isMagnifyVisible = ref(false);
const speed = ref(1);
const playIntervalRef = ref<NodeJS.Timeout | null>(null);
const cornerstoneElement = ref<any>(null);
const zoomFactor = ref(2);
const customlabel = ref(false);
const bookmarkarray = ref<number[]>([]);
const toolusedonframe = ref<string[]>([]);
const isEditMode = ref(false);
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
const hideMeasurements = ref(false)
const currentCustomLabel = ref<string | null>(null)
const customToolMap: Record<string, { tool: string; label: string }> = {
    NT: { tool: LengthTool.toolName, label: 'NT' },
    CRL: { tool: LengthTool.toolName, label: 'CRL' },
    TT: { tool: LengthTool.toolName, label: 'TT' },
    FL: { tool: LengthTool.toolName, label: 'FL' },
    CM: { tool: LengthTool.toolName, label: 'CM' },
    BPD: { tool: EllipticalROITool.toolName, label: 'BPD' },
    BS: { tool: EllipticalROITool.toolName, label: 'BS' },
    CR: { tool: AngleTool.toolName, label: 'CR' },
    AB: { tool: LengthTool.toolName, label: 'NT' },
    CD: { tool: LengthTool.toolName, label: 'CRL' },
    EF: { tool: LengthTool.toolName, label: 'TT' },
    GG: { tool: LengthTool.toolName, label: 'FL' },
    HH: { tool: LengthTool.toolName, label: 'CM' },
    TH: { tool: EllipticalROITool.toolName, label: 'BPD' },
    TG: { tool: EllipticalROITool.toolName, label: 'BS' },
    VF: { tool: AngleTool.toolName, label: 'CR' },
};

function handleFileChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        currentFile.value = file;
    }

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

onBeforeMount(() => {
    const element = document.getElementById("cornerstoneDiv");
    cornerstoneElement.value = (element);

})

onMounted(() => {
    const el = document.querySelector('.cornerstone-element') as HTMLElement
    el?.focus()

})

watch(currentFile, async () => {
    try {
        await cornerstoneCoreInit();
        await cornerstoneToolsInit();
        await dicomLoaderInit();

        metaData.addProvider(
            (type, imageId) => hardcodedMetaDataProvider(type, imageId, imageId),
            10000
        );
        const element = elementRef.value;
        if (!element || !currentFile.value) return;

        if (renderingEngineRef.value) {
            renderingEngineRef.value.destroy();
            renderingEngineRef.value = null;

        }
        ToolGroupManager.destroyToolGroup(toolGroupId);
        annotation.state.removeAllAnnotations()

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
        await imageLoader.loadImage(baseImageId);
        const metadata = metaData.get("multiframeModule", baseImageId);
        const numberOfFrames = metadata?.NumberOfFrames || 1;
        frameCount.value = numberOfFrames;
        if (numberOfFrames > 1) {
            
            const imageIds = numberOfFrames > 1
                ? Array.from({ length: numberOfFrames }, (_, i) => `${baseImageId}?frame=${i + 1}`)
                : [baseImageId];

            await viewport.setStack(imageIds);
        }
        else if (numberOfFrames == 1) {
            await viewport.setStack([baseImageId]);
        }
        viewport.setImageIdIndex(0);
        metaData.addProvider((type, baseImageId) => {
            if (type === 'imagePlaneModule') {
                return {
                    rowPixelSpacing: 1,
                    columnPixelSpacing: 1,
                    imagePositionPatient: [0, 0, 0],
                    rowCosines: [1, 0, 0],
                    columnCosines: [0, 1, 0],
                };
            }
        }, 99);
        viewport.render();
        const toolgrp = ToolGroupManager.getToolGroup(toolGroupId);
        if (toolgrp) {
            ToolGroupManager.destroyToolGroup(toolGroupId)
        }
        [
            PanTool,
            ZoomTool,
            WindowLevelTool,
            CustomLengthTool,
            RectangleROITool,
            customellipse,
            customangletool,
            LabelTool,
            CustomSplineROITool,
            customCobbAngleTool,
            custombidirectional
        ].forEach(addTool);

        const toolGroup = ToolGroupManager.createToolGroup(toolGroupId);
        if (!toolGroup) return;

        [
            PanTool,
            ZoomTool,
            WindowLevelTool,
            CustomLengthTool,
            RectangleROITool,
            customellipse,
            customangletool,
            LabelTool,
            CustomSplineROITool,
            customCobbAngleTool,
            custombidirectional
        ].forEach((Tool) => {
            toolGroup.addTool(Tool.toolName);
        });
        toolGroup.addViewport(viewportId, renderingEngineId);
        annotation.config.style.setToolGroupToolStyles(toolGroupId, {
            global: {
                lineWidth: "2",
                lineDash: "7,8",
                color: "#FFC700",
                colorHighlighted: "#FFC700",
                colorSelected: "#FFC700",
                colorLocked: "#FFC700",
                textBoxFontFamily: "Roboto",
                textBoxColorHighlighted: "#FFC700",
                textBoxColorSelected: "#FFC700",
                textBoxColorLocked: "#FFC700",
                textBoxColor: "#FFC700",
                textBoxLinkLineWidth: '1',
                textBoxLinkLineDash: '2,3',

            },
        });
        toolGroup.addViewport(viewportId, renderingEngineId);


        loaded.value = true;
    } catch (error) {
        console.error("DICOM load/render error:", error);
    }
});



const thumbnails = [
    '/img.png',
    '/img.png',
    '/img.png',
    '/img.png',
    '/img.png',
    '/img.png',
    '/img.png',


];

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
    elementRef,
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
            //isPlaying.value = false;
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
const handlePlay = () => {
    isPlaying.value = true;

};
const handlePause = () => {
    isPlaying.value = false;
};
const handleSpeedChange = (num: number) => {
    speed.value = num;
};

const handleToolChange = (selectedToolName: string) => {
    customlabel.value = false;
    prevToolRef.value = selectedToolName;
    if (["Length", "EllipticalROI", "Angle", "Label", "SplineROI", "CobbAngle", "Bidirectional"].includes(selectedToolName) && isMagnifyVisible.value === false) {
        isMagnifyVisible.value = true;
    } else if (
        isMagnifyVisible &&
        ["Pan", "Zoom", "WindowLevel"].includes(selectedToolName)
    ) {
        isMagnifyVisible.value = false;
    }
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

    if (!toolGroup) return;
    const allTools = [
        PanTool.toolName,
        ZoomTool.toolName,
        WindowLevelTool.toolName,
        CustomLengthTool.toolName,
        RectangleROITool.toolName,
        customellipse.toolName,
        customangletool.toolName,
        LabelTool.toolName,
        CustomSplineROITool.toolName,
        customCobbAngleTool.toolName,
        custombidirectional.toolName
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

const handleToolChange2 = (selectedToolName: string) => {
    customlabel.value = true;
    const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);

    if (!toolGroup) return;
    const customTool = customToolMap[selectedToolName];
    const actualToolName = customTool ? customTool.tool : selectedToolName;
    prevToolRef.value = actualToolName;

    if (["Length", "RectangleROI", "EllipticalROI", "Angle", "Label", "SplineROI", "CobbAngle", "Bidirectional"].includes(actualToolName) && isMagnifyVisible.value === false) {
        isMagnifyVisible.value = (true);
    } else if (
        isMagnifyVisible &&
        ["Pan", "Zoom", "WindowLevel"].includes(actualToolName)
    ) {
        isMagnifyVisible.value = (false);
    }
    currentCustomLabel.value = customTool ? customTool.label : null
    const allTools = [
        PanTool.toolName,
        ZoomTool.toolName,
        WindowLevelTool.toolName,
        CustomLengthTool.toolName,
        RectangleROITool.toolName,
        customellipse.toolName,
        customangletool.toolName,
        LabelTool.toolName,
        CustomSplineROITool.toolName,
        customCobbAngleTool.toolName,
        custombidirectional.toolName
    ];
    allTools.forEach((toolName) => {
        if (toolName === actualToolName) {
            toolGroup.setToolActive(toolName, {
                bindings: [{ mouseButton: csToolsEnums.MouseBindings.Primary }],
            });
        } else {
            toolGroup.setToolPassive(toolName);
        }
    });
    //elementRef.value.style.cursor = 'auto'
    isMagnifyVisible.value = ['Length', 'RectangleROI', 'EllipticalROI', 'Angle', 'Label', 'SplineROI', 'CobbAngle', 'Bidirectional'].includes(actualToolName);
    prevToolRef.value = actualToolName;
    if (!toolusedonframe.value.includes(actualToolName)) {
        toolusedonframe.value.push(actualToolName);
    }
    const viewport = renderingEngineRef.value?.getViewport(viewportId);
    viewport?.render();


}
const { prevTool } = useLabelToolDrag(
    elementRef,
    renderingEngineRef,
    viewportId,
    toolGroupId,
    isMagnifyVisible,
    prevToolRef,
    currentCustomLabel,
    customlabel

);
prevToolRef.value = prevTool.value

onMounted(() => {
    eventTarget.addEventListener(csToolsEnums.Events.ANNOTATION_ADDED,
        () => {
            const toolGroup = ToolGroupManager.getToolGroup(toolGroupId);
            const activeTool = toolGroup?.getCurrentActivePrimaryToolName()
            if (!toolGroup) return
            if (!activeTool) return
            toolGroup.setToolPassive(activeTool);
            //if (element) element.style.cursor = 'auto';
            const viewport = renderingEngineRef.value?.getViewport(viewportId);
            viewport?.render();
        }
    );



})



const trackNewAnnotations = () => {
    const annotations = annotation.state.getAllAnnotations();
    annotations.forEach((a) => {
        undostack.push({
            uid: a.annotationUID,
            annotations: a,
        });
    });
};

const playbackButtons = computed(() => [
    { name: 'mdi:skip-backward', onClick: () => handleFrameChange(frameIndex.value - 1), label: 'Prev' },

    isPlaying.value
        ? { name: 'mdi:pause', onClick: () => { handlePause(); isPlaying.value = false }, label: 'Pause' }
        : { name: 'mdi:play-circle-outline', onClick: () => { handlePlay(); isPlaying.value = true }, label: 'Play' },

    { name: 'mdi:skip-forward', onClick: () => handleFrameChange(frameIndex.value + 1), label: 'Next' },
])

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
    const bookmarkedIndex = frameNumber - 1;
    if (!bookmarkarray.value.includes(bookmarkedIndex)) {
        bookmarkarray.value = [...bookmarkarray.value, bookmarkedIndex];
    }
    isBookmarked.value = true;


};

watch(frameIndex, () => {
    const ann = annotation.state.getAllAnnotations();
    ann.forEach((elem: any) => {
        const imageId = elem.metadata?.referencedImageId;
        const frameMatch = imageId?.match(/frame=(\d+)/);
        if (frameMatch) {
            const frameNumber = parseInt(frameMatch[1]);
            if (frameNumber) bookmark(frameNumber);
        }
    });
});

const toggleAnnotations = () => {
    const ann = annotation.state.getAllAnnotations();
    const val = hideAnnotation.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;

    if (val) {
        ann.forEach(a => {
            if (a.annotationUID && a.metadata?.toolName === 'Label') {
                annotation.visibility.setAnnotationVisibility(a.annotationUID);
            }
        })
    } else {

        ann.forEach(a => {
            if (a.annotationUID && a.metadata?.toolName === 'Label') {
                annotation.visibility.setAnnotationVisibility(a.annotationUID, false);
            }
        });
    }
    viewport.render();
    hideAnnotation.value = !val;
};

const toggleMeasurements = () => {
    const ann = annotation.state.getAllAnnotations();
    const val = hideMeasurements.value;
    const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;

    if (val) {
        ann.forEach(a => {
            if (a.annotationUID && a.metadata?.toolName !== 'Label') {
                annotation.visibility.setAnnotationVisibility(a.annotationUID);
            }
        });
    } else {
        ann.forEach(a => {
            if (a.annotationUID && a.metadata?.toolName !== 'Label') {
                annotation.visibility.setAnnotationVisibility(a.annotationUID, false);
            }
        });
    }
    viewport.render();
    hideMeasurements.value = !val;
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
    LengthTool,
    EllipticalROITool,
    AngleTool,

];

window.addEventListener('keydown', (event) => {
    if (event.key === 'Backspace' || event.key === 'Delete') {
        const viewport = renderingEngineRef.value?.getViewport(viewportId) as StackViewport;
        const selectedUIDs = annotation.selection.getAnnotationsSelected();
        if (selectedUIDs) {
            selectedUIDs.forEach((uid) => {

                annotation.state.removeAnnotation(uid);
                annotation.selection.setAnnotationSelected(uid, false);
            });
            viewport?.render()
        }

    }
});

</script>

<template>
    <div
        class="w-screen h-screen bg-black text-white font-sans grid grid-rows-[auto_1fr] grid-cols-[1fr_auto] overflow-hidden">
        <div class="col-span-2 m-1">
            <TopHeader patientId="OM-29174822" lmp="04/23/2023" ga="12w2d" edd="01/28/2024" examType="NT SCAN"
                userInitials="JD" />
        </div>
        <div class="flex h-full m-1">
            <div
                class="w-[111px] h-[938px] bg-neutral-900 border-r border-gray-800 flex flex-col items-center py-2 overflow-y-auto m-1">

                <button class="tool-btn m-1" @click="">
                    <Icon name="mdi:arrow-left" />
                </button>
                <div class="flex flex-col items-center space-y-2 m-1">
                    <button v-for="(thumb, index) in thumbnails" :key="index"
                        class="w-20 h-20 rounded overflow-hidden border-2"
                        :class="index === 0 ? 'border-blue-500' : 'border-transparent'" @click="">
                        <img :src="thumb" class="object-cover w-full h-full" />
                    </button>
                </div>

            </div>
            <div class="flex-1 flex flex-col m-1">
                <div class="flex justify-between items-center px-4 py-2 bg-neutral-950 border-b border-gray-800">
                    <div class="font-semibold text-2xl">CRL <span class="text-gray-400 text-base">Midsagittal
                            view</span></div>
                    <button v-if="!isEditMode"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-s"
                        @click="isEditMode = true">
                        <Icon name="mdi:pen" class="w-8 h-10" /> Edit
                    </button>
                </div>
                <div ref="elementRef" id="cornerstoneDiv" tabindex="0"
                    class="relative bg-neutral-900 mx-auto my-2 rounded-md shadow-md m-1 focus:outline-none"
                    style="width: 680px; height: 500px;" />
                <ViewportOverlay :elementRef="elementRef" :isMagnifyVisible="isMagnifyVisible" :zoomFactor="zoomFactor"
                    @update:zoomFactor="(val) => (zoomFactor = val)" />

                <div v-if="!isEditMode" class="border-t border-gray-800">
                    <PlayerSlider :handleFrameChange="handleFrameChange" :frameIndex="frameIndex"
                        :frameCount="frameCount" :isBookmarked="isBookmarked" :bookmarkarray="bookmarkarray" />
                    <PlayerControls :handleSpeedChange="handleSpeedChange" :playbackButtons="playbackButtons"
                        :handleToolChange="handleToolChange" :captureDicom="captureDicom" :elementRef="elementRef"
                        :frameIndex="frameIndex" :frameCount="frameCount" />
                </div>
                <template v-if="isEditMode">
                    <div class="">
                        <ResetComponent :undo="undo" :redo="redo" :reset="clear" :undostack="undostack"
                            :redostack="redostack" />
                        <ExitEditor @exit="isEditMode = false" @save="" @replace="" />
                    </div>
                </template>
            </div>
        </div>
        <div class="h-full w-[365px] overflow-hidden m-1">
            <SummarySidebar v-if="!isEditMode" :cineEvaluation="[
                { label: 'Crown', level: 'normal' },
                { label: 'Nasal Bone', level: 'normal' },
                { label: 'Absent Zygoma', level: 'normal' },
                { label: 'Head And Rump Fill > 60% Of The Scan Area', level: 'normal' },
                { label: 'Rump', level: 'normal' },
                { label: 'Neutral Position (Angle Between Chin And Anterior Neck < 90º)', level: 'warning' },
                { label: 'Fetus In Horizontal Orientation', level: 'warning' },
            ]" />
            <SidebarControls v-else :handleToolChange="handleToolChange" :handleToolChange2="handleToolChange2"
                :handleFlip="handleFlip" :undo="undo" :redo="redo" :clear="clear" :captureDicom="captureDicom"
                :handleFileChange="handleFileChange" :toggleAnnotations="toggleAnnotations"
                :toggleMeasurements="toggleMeasurements" :hideMeasurements="hideMeasurements"
                :hideAnnotation="hideAnnotation" :toolList="toolList" :customToolMap="customToolMap"
                :elementRef="elementRef" :frameIndex="frameIndex" :cornerstoneElement="elementRef"
                :renderingEngineRef="renderingEngineRef" :viewportId="viewportId" :toolGroupId="toolGroupId" />
        </div>

        <LabelInputOverlay :visible="labelInputVisible" :coords="labelInputCoords" :value="labelInputValue"
            :onChange="setLabelInputValue" :onSubmit="onLabelSubmit" :onClose="onLabelCancel" />
    </div>
</template>
