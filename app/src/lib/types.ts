export type Programme = {
  id: string; name: string; duration: string | null; is_bundle: boolean; sort: number;
};
export type Enrolment = {
  id: string; programme_id: string; valid_until: string | null; created_at: string;
  programme?: Programme;
};
export type LiveClass = {
  id: string; programme_id: string; title: string; starts_at: string; duration_min: number;
  zoom_url: string | null; zoom_passcode: string | null;
};
export type Recording = {
  id: string; class_id: string; title: string | null; available_until: string;
  class?: LiveClass; watched?: boolean;
};
export type Announcement = { id: string; message: string; created_at: string };
export type Me = { id: string; email: string; full_name: string | null };
