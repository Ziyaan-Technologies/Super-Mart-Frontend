<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  node: any;
  forceOpen?: boolean;
}>();

const emit = defineEmits<{
  (e: 'add-child', node: any): void;
  (e: 'edit', node: any): void;
  (e: 'delete', node: any): void;
}>();

const open = ref(props.node.level < 2);
const levelNames: Record<number, string> = { 1: 'Department', 2: 'Aisle', 3: 'Category' };
</script>

<template>
  <div>
    <div class="category-row d-flex align-center flex-wrap gap-2 py-2 pr-3" :style="{ paddingLeft: `${12 + (node.level - 1) * 28}px` }">
      <v-btn v-if="node.children.length" :icon="open || forceOpen ? 'mdi-chevron-down' : 'mdi-chevron-right'" size="x-small" variant="text" @click="open = !open" />
      <span v-else class="category-spacer" />
      <v-avatar size="30" rounded="md" color="grey100">
        <v-img v-if="node.image_url" :src="node.image_url" cover />
        <v-icon v-else size="18" color="primary">{{ node.level === 1 ? 'mdi-store-outline' : node.level === 2 ? 'mdi-view-column-outline' : 'mdi-shape-outline' }}</v-icon>
      </v-avatar>
      <span class="text-subtitle-2">{{ node.name }}</span>
      <v-chip size="x-small" variant="tonal" color="primary">{{ levelNames[node.level] }}</v-chip>
      <v-chip v-if="!node.is_active" size="x-small" color="error" variant="tonal">Inactive</v-chip>
      <span v-if="node.children.length" class="text-caption text-lightText">{{ node.children.length }} inside</span>
      <v-spacer />
      <v-btn v-if="$can('categories_create', 'Category') && node.level < 3" size="small" variant="text" color="primary" prepend-icon="mdi-plus"
        class="text-capitalize" @click="emit('add-child', node)">Add {{ levelNames[node.level + 1] }}</v-btn>
      <v-btn v-if="$can('categories_edit', 'Category')" icon="mdi-pencil-outline" color="#EFF0F1" size="small" @click="emit('edit', node)"></v-btn>
      <v-btn v-if="$can('categories_delete', 'Category')" icon="mdi-delete-outline" color="#FFEFEF" size="small" class="text-error" @click="emit('delete', node)"></v-btn>
    </div>
    <div v-if="open || forceOpen">
      <CategoryNode v-for="child in node.children" :key="child.id" :node="child" :force-open="forceOpen"
        @add-child="emit('add-child', $event)" @edit="emit('edit', $event)" @delete="emit('delete', $event)" />
    </div>
  </div>
</template>

<style scoped>
.category-row {
  border-bottom: 1px solid rgb(var(--v-theme-borderColor));
}
.category-row:hover {
  background: rgb(var(--v-theme-hoverColor));
}
.category-spacer {
  display: inline-block;
  width: 28px;
}
</style>
