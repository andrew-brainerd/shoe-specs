export interface WidgetValue {
  name: string;
  isMarked: boolean;
}

export interface Widget {
  title: string;
  type: string;
  values: WidgetValue[];
}

export interface Product {
  name: string;
  widgetsData: Widget[];
}

export interface ProductData {
  products: Product[];
}
