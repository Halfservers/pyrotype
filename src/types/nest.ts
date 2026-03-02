export interface Egg {
  id: number;
  uuid: string;
  name: string;
  description: string;
}

export interface Nest {
  id: number;
  uuid: string;
  author: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  eggs: Egg[];
}
