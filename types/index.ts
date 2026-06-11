export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Brand {
  id: string;
  name: string;
  created_at: string;
}

export interface Application {
  id: string;
  submission_id: string;
  line_user_id: string | null;
  creator_name: string;
  brand: string;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
}

// 申請フォームの1ブランド分の入力
export interface ApplyEntryForm {
  brand: string;
  // 各ブランドにつき最大3回の日程
  schedules: {
    startDate: string;
    endDate: string;
  }[];
}

// API に送信する正規化済みの1件分
export interface ApplyEntry {
  brand: string;
  startDate: string;
  endDate: string;
}

export interface CreateApplicationsBody {
  entries: ApplyEntry[];
}

export interface UpdateApplicationBody {
  status: "approved" | "rejected";
}
