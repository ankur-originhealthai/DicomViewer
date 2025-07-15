<template>
  <div class="bg-neutral-900 p-4 border-l border-gray-800 overflow-y-auto space-y-6 text-sm h-[670px]">

    <AddLabelToCanvas ref="addLabelRef" :cornerstoneElement="props.cornerstoneElement"
      :renderingEngineRef="props.renderingEngineRef" :viewportId="props.viewportId" :toolGroupId="props.toolGroupId" />

    <div class="flex justify-between gap-4 text-xs mb-1">

      <div class="flex justify-between gap-3 text-xs mb-1">

        <div class="bg-neutral-800 border border-[#2c2c2f] rounded-md px-2 py-2 w-1/2">
          <h3 class="text-sm font-semibold text-neutral-300">AI Tools</h3>
          <p class="text-[11px] text-gray-500 mb-3">Automatically detected by AI</p>

          <div class="flex gap-2">
            <button class="tool-btn flex items-center gap-1">
              <Icon name="mdi:ruler" class="w-6 h-6" />
            </button>
            <button class="tool-btn flex items-center gap-1">
              <Icon name="mdi:pencil" class="w-6 h-6" />
            </button>
          </div>
        </div>

        <div class="bg-neutral-800 border border-[#2c2c2f] rounded-md px-4 py-2 w-1/2">
          <h3 class="text-sm font-semibold text-neutral-300">Show</h3>
          <p class="text-[11px] text-gray-500 mb-2">View options for all markups</p>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="text-gray-300">Measurements</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="showMeasurements" @click="toggleMeasurements" class="sr-only peer" />
                <div
                  class="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all duration-200">
                </div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 peer-checked:translate-x-4">
                </div>
              </label>
            </div>

            <div class="flex items-center justify-between">
              <span class="text-gray-300">Annotations</span>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" v-model="showAnnotations" @click="toggleAnnotations" class="sr-only peer" />
                <div
                  class="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-all duration-200">
                </div>
                <div
                  class="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-200 peer-checked:translate-x-4">
                </div>
              </label>
            </div>
          </div>

        </div>

      </div>


    </div>


    <div class="flex space-x-3">
      <button class="w-full text-sm rounded-t-md"
        :class="activeTab === 'measure' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'"
        @click="activeTab = 'measure'">Measure</button>
      <button class="w-full py-2 text-sm rounded-t-md"
        :class="activeTab === 'annotate' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'"
        @click="activeTab = 'annotate'">Annotate</button>
      <button class="w-full py-2 text-sm rounded-t-md"
        :class="activeTab === 'cine' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'"
        @click="activeTab = 'cine'">Cine</button>
    </div>

    <div v-if="activeTab === 'measure'" class="space-y-5 bg-neutral-800 p-2">
      <div>
        <h3 class="text-neutral-300 font-semibold mb-1">OB Measurements</h3>
        <p class="text-neutral-300 text-xs mb-3">OB Measurements tools are present with required calipers</p>
        <div ref="obScrollRef" class="flex gap-2 overflow-x-hidden max-w-full pointer-events-none">
          <div class="grid grid-rows-3 grid-flow-col gap-3 pointer-events-auto">
            <button v-for="(tool, key) in customToolMap" :key="key" @click="() => handleToolChange2(key)"
              class="tool-btn">
              {{ key }}
            </button>
          </div>
        </div>

        <div class="flex justify-between items-center mt-1 w-full px-1">
          <button @click="scrollOBLeft" class="tool-btn h-9 w-5 items-center justify-center">
            <Icon name="mdi:chevron-left" class="w-10 h-5 text-white" />
          </button>

          <button @click="scrollOBRight" class="tool-btn h-9 w-5 items-center justify-center">
            <Icon name="mdi:chevron-right" class="w-10 h-5 text-white" />
          </button>
        </div>


      </div>

      <div>
        <h3 class="text-neutral-300 font-semibold mb-1">Caliper Measurements</h3>
        <p class="text-neutral-300 text-xs mb-1">Caliper Measurements will not be included as part of your exam findings</p>

        <p class="text-neutral-500 text-xs m-1">2D Tools</p>
        <div class="grid grid-cols-3 gap-2">
          <button @click="() => handleToolChange('Length')" class="tool-btn">
            <Icon name="mdi:ruler" class="w-2 h-4" />
            Dist.
          </button>

          <button @click="() => handleToolChange('EllipticalROI')" class="tool-btn">
            <Icon name="mdi:ellipse-outline" class="w-2 h-4" />
            Ellipse
          </button>

          <button @click="() => handleToolChange('Angle')" class="tool-btn">
            <Icon name="mdi:angle-acute" class="w-2 h-4" />
            Angle
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'annotate'" class="mt-4 space-y-4">
      <h3 class="text-white font-semibold">Annotation Labels</h3>
      <div class="grid grid-cols-2 gap-2">
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
        <button class="tool-btn" @click="addNow('Vertebral Element')">Vertebral Element</button>
      </div>

      <div class="mt-6">
        <h3 class="font-semibold text-gray-300 mb-2">Upload DICOM</h3>
        <input type="file" accept=".dcm" @change="handleFileChange"
          class="text-white bg-gray-800 px-3 py-2 rounded w-full" />
      </div>

    </div>

    <div v-if="activeTab === 'cine'" class="mt-4 space-y-4">
      <h3 class="text-white font-semibold">Image Controls</h3>
      <div class="grid grid-cols-2 gap-2">
        <button @click="() => handleFlip('VFlip')" class="tool-btn">
          <Icon name="mdi:flip-vertical" class="w-2 h-4" />
          V Flip
        </button>
        
        <button @click="() => handleFlip('HFlip')" class="tool-btn">
          <Icon name="mdi:flip-horizontal" class="w-2 h-4" />
          H Flip
        </button>

        <button @click="() => handleToolChange('Pan')" class="tool-btn">
          <Icon name="mdi:hand-back-right-outline" class="w-2 h-4" />
          Pan
        </button>

        <button @click="() => handleToolChange('Zoom')" class="tool-btn">
          <Icon name="mdi:magnify-plus" class="w-2 h-4" />
          Zoom
        </button>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, defineProps } from 'vue';
import AddLabelToCanvas from './AddLabelToCanvas.vue';

const addLabelRef = ref();
function addNow(label: string) {
  addLabelRef.value?.triggerAddLabel(label);
}

const activeTab = ref<'measure' | 'annotate' | 'cine'>('measure');
const showMeasurements = ref(true);
const showAnnotations = ref(true);
const obScrollRef = ref<HTMLElement | null>(null);

const props = defineProps<{
  handleToolChange: (toolName: string) => void,
  handleToolChange2: (key: string) => void,
  handleFlip: (type: string) => void,
  undo: () => void,
  redo: () => void,
  clear: () => void,
  captureDicom?: (elementRef: any, frameIndex: number) => void,
  handleFileChange: (e: Event) => void,
  toggleAnnotations?: () => void,
  toggleMeasurements?: () => void,
  hideAnnotation?: boolean,
  hideMeasurements?: boolean,
  toolList?: any[],
  customToolMap: Record<string, any>,
  elementRef?: any,
  frameIndex?: number,
  cornerstoneElement: HTMLElement | null,
  renderingEngineRef: any,
  viewportId: string,
  toolGroupId: string
}>();

const scrollOBLeft = () => {
  if (obScrollRef.value) {
    obScrollRef.value.scrollLeft -= 100;
  }
};

const scrollOBRight = () => {
  if (obScrollRef.value) {
    obScrollRef.value.scrollLeft += 100;
  }
};
</script>
