export type Role = 'admin' | 'photographer' | 'counter' | 'print';

export type OrderType = 'digital' | 'print' | 'frame' | 'combo';

export type PayMode = 'cash' | 'upi' | 'card' | 'split' | 'razorpay';

export interface ApiUser {
  id: string;
  name: string;
  username: string;
  role: Role;
  active?: boolean;
}

export interface DashboardStats {
  guests_today: number;
  photos_today: number;
  orders_today: number;
  revenue_today: number;
  pending_prints: number;
  digital_orders: number;
  print_orders: number;
  frame_orders: number;
  combo_orders: number;
  hourly_revenue: Array<{ hour: string; revenue: number; orders: number }>;
  rides_stats: Array<{
    ride_id: string;
    ride_name: string;
    photos: number;
    orders: number;
    revenue: number;
  }>;
  recent_orders: Array<{
    id: string;
    guest_name: string | null;
    ride_name: string;
    order_type: string;
    price: number;
    created_at: string;
  }>;
  wristbands: { total: number; active: number; inactive: number };
}

export interface ParkConfig {
  success: boolean;
  park_name: string;
  prices: Record<OrderType, number>;
  payment: { upi_id: string; upi_name: string };
}
