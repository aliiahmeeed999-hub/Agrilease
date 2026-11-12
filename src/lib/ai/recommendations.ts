import type { CropType, EquipmentStatus, EquipmentType, TaskStatus } from "@/generated/prisma/enums";
import type { EquipmentFit, TaskRecommendation } from "@/types/ai";
import { predictClassificationTree, type ClassificationNode } from "@/lib/ai/classificationTree";
import equipmentModelData from "@/lib/ai/equipmentModel.json";

interface EquipmentModel {
  featureNames: string[];
  cropTypes: string[];
  taskTypes: string[];
  tree: ClassificationNode[];
}
const equipmentModel = equipmentModelData as unknown as EquipmentModel;

// Below this confidence, the trained classifier's leaf is too weakly decided
// to trust over the keyword rules (see README at scripts/ml/train_equipment_classifier.py
// for why a single decision tree - chosen for simple TS serving - has real,
// expected leaves where the majority class barely edges out the rest).
const CLASSIFIER_CONFIDENCE_THRESHOLD = 0.5;

export interface RecommendationTaskInput {
  id: string;
  title: string;
  status: TaskStatus;
  fieldName: string | null;
  cropType?: CropType | null;
  farmSizeHectares?: number | null;
  scheduledStart?: Date | null;
}

export interface RecommendationEquipmentInput {
  id: string;
  name: string;
  type: EquipmentType;
  status: EquipmentStatus;
  enginePowerHp: number;
  maintenanceDueSoon?: boolean;
}

const REFERENCE_HP = 155; // seeded John Deere 6R 155

// Keyword -> task-type category, the same categories the synthetic training
// data (generate_synthetic_data.py) and the classifier were built around -
// also still used standalone as the documented rule-based fallback.
const KEYWORD_RULES: { keywords: string[]; taskType: string; idealTypes: EquipmentType[] }[] = [
  { keywords: ["plow", "plowing", "tillage"], taskType: "PLOWING", idealTypes: ["PLOW", "TRACTOR"] },
  { keywords: ["spray", "spraying", "fertilizer"], taskType: "SPRAYING", idealTypes: ["SPRAYER", "TRACTOR"] },
  { keywords: ["harvest"], taskType: "HARVESTING", idealTypes: ["HARVESTER"] },
  { keywords: ["transport", "hauling", "haul"], taskType: "TRANSPORT", idealTypes: ["TRAILER", "TRACTOR"] },
  { keywords: ["irrigation", "water"], taskType: "IRRIGATION", idealTypes: ["IRRIGATION_PUMP"] },
];

function matchKeywordRule(title: string) {
  const lower = title.toLowerCase();
  return KEYWORD_RULES.find((rule) => rule.keywords.some((kw) => lower.includes(kw)));
}

function buildClassifierFeatures(taskType: string, cropType: CropType, farmSizeHectares: number, month: number): number[] {
  const cropOneHot = equipmentModel.cropTypes.map((c) => (c === cropType ? 1 : 0));
  const taskOneHot = equipmentModel.taskTypes.map((t) => (t === taskType ? 1 : 0));
  return [...cropOneHot, ...taskOneHot, farmSizeHectares, month];
}

// Tries the trained classifier first (real crop/task/farm-size/month features,
// see scripts/ml/train_equipment_classifier.py); falls back to the original
// keyword rule whenever the inputs needed for the model aren't available (no
// linked field/crop) or its confidence is too low - never silently returns
// nothing.
function idealTypeSource(task: RecommendationTaskInput): { idealTypes: EquipmentType[]; modelBacked: boolean; confidence: number | null } {
  const rule = matchKeywordRule(task.title);
  const fallback = { idealTypes: rule?.idealTypes ?? (["TRACTOR"] as EquipmentType[]), modelBacked: false, confidence: null };

  if (!rule || !task.cropType || task.farmSizeHectares == null || !task.scheduledStart) {
    return fallback;
  }
  if (!equipmentModel.cropTypes.includes(task.cropType)) {
    return fallback; // OTHER, or any crop type the synthetic generator didn't cover
  }

  const month = task.scheduledStart.getMonth() + 1;
  const features = buildClassifierFeatures(rule.taskType, task.cropType, task.farmSizeHectares, month);
  const result = predictClassificationTree(equipmentModel.tree, features);

  if (result.confidence < CLASSIFIER_CONFIDENCE_THRESHOLD) {
    return fallback;
  }
  return { idealTypes: [result.predictedClass as EquipmentType], modelBacked: true, confidence: result.confidence };
}

const STATUS_SCORE: Record<EquipmentStatus, number> = {
  ACTIVE: 25,
  IDLE: 15,
  MAINTENANCE: 5,
  OFFLINE: 0,
};

function scoreEquipment(
  idealTypes: EquipmentType[],
  equipment: RecommendationEquipmentInput,
  modelBacked: boolean,
  confidence: number | null
) {
  const reasoning: string[] = [];
  let typeScore = 10;

  if (equipment.type === idealTypes[0]) {
    typeScore = 60;
    reasoning.push(
      modelBacked && confidence !== null
        ? `${labelForType(equipment.type)} is the ideal implement for this task (trained model, ${Math.round(confidence * 100)}% confidence).`
        : `${labelForType(equipment.type)} is the ideal implement for this task.`
    );
  } else if (idealTypes.includes(equipment.type)) {
    typeScore = 35;
    reasoning.push(`${labelForType(equipment.type)} can support this task, though it isn't the primary implement.`);
  } else {
    reasoning.push(`${labelForType(equipment.type)} is not a typical match for this task type.`);
  }

  const statusScore = STATUS_SCORE[equipment.status];
  reasoning.push(
    equipment.status === "ACTIVE"
      ? "Currently ACTIVE and ready to deploy."
      : `Currently ${equipment.status.toLowerCase()}.`
  );

  const powerScore = Math.min(15, Math.round((equipment.enginePowerHp / REFERENCE_HP) * 15));

  let maintenancePenalty = 0;
  if (equipment.maintenanceDueSoon) {
    maintenancePenalty = 20;
    reasoning.push("Maintenance is due soon on this unit — consider scheduling service before this task.");
  }

  return {
    fitScore: Math.max(0, Math.round(typeScore + statusScore + powerScore - maintenancePenalty)),
    reasoning,
  };
}

function labelForType(type: EquipmentType) {
  return type.charAt(0) + type.slice(1).toLowerCase().replace("_", " ");
}

export function recommendEquipmentForTask(
  task: RecommendationTaskInput,
  fleet: RecommendationEquipmentInput[]
): TaskRecommendation {
  const { idealTypes, modelBacked, confidence } = idealTypeSource(task);

  const recommendations: EquipmentFit[] = fleet
    .map((equipment) => {
      const { fitScore, reasoning } = scoreEquipment(idealTypes, equipment, modelBacked, confidence);
      return {
        equipmentId: equipment.id,
        equipmentName: equipment.name,
        equipmentType: equipment.type,
        fitScore,
        reasoning,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

  const noIdealMatchInFleet = !fleet.some((e) => idealTypes.includes(e.type));

  return {
    taskId: task.id,
    taskTitle: task.title,
    fieldName: task.fieldName,
    status: task.status,
    recommendations,
    noIdealMatchInFleet,
  };
}

export function buildRecommendations(tasks: RecommendationTaskInput[], fleet: RecommendationEquipmentInput[]) {
  const results = tasks.map((task) => recommendEquipmentForTask(task, fleet));

  return {
    upcoming: results.filter((r) => r.status === "PENDING" || r.status === "IN_PROGRESS"),
    completedReview: results.filter((r) => r.status === "COMPLETED"),
  };
}
