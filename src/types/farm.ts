import type {
  CropType,
  FieldStatus,
  IrrigationType,
  WaterSource,
  SoilType,
} from "@/generated/prisma/enums";

export interface FarmListItem {
  id: string;
  name: string;
  region: string;
  province: string | null;
  sizeHectares: number;
  latitude: number;
  longitude: number;
  imageUrl: string | null;
  fieldsCount: number;
  workersCount: number;
}

export interface FarmFieldItem {
  id: string;
  name: string;
  cropType: CropType;
  areaHectares: number;
  centerLat: number;
  centerLng: number;
  polygon: [number, number][];
  // True while the outline is the square generated from centre + area, i.e.
  // nobody has drawn the real boundary yet.
  boundaryEstimated: boolean;
  status: FieldStatus;
  soilType: SoilType | null;
  irrigationMethod: IrrigationType | null;
  plantedAt: string | null;
  expectedHarvestAt: string | null;
}

export interface FarmDetail {
  id: string;
  name: string;
  region: string;
  province: string | null;
  sizeHectares: number;
  latitude: number;
  longitude: number;
  elevation: number | null;
  irrigationType: IrrigationType | null;
  waterSource: WaterSource | null;
  soilType: SoilType | null;
  imageUrl: string | null;
  createdAt: string;
  workersCount: number;
  fields: FarmFieldItem[];
}

export interface CreateFarmInput {
  name: string;
  region: string;
  province?: string;
  sizeHectares: number;
  latitude: number;
  longitude: number;
  elevation?: number;
  irrigationType?: IrrigationType;
  waterSource?: WaterSource;
  soilType?: SoilType;
  imageUrl?: string;
}

export type UpdateFarmInput = Partial<CreateFarmInput>;

export interface CreateFieldInput {
  name: string;
  cropType: CropType;
  areaHectares: number;
  centerLat: number;
  centerLng: number;
  status?: FieldStatus;
  soilType?: SoilType;
  irrigationMethod?: IrrigationType;
  plantedAt?: string;
  expectedHarvestAt?: string;
}

export type UpdateFieldInput = Partial<CreateFieldInput> & {
  // A boundary drawn on the map, as [lat, lng] pairs.
  polygon?: [number, number][];
};
