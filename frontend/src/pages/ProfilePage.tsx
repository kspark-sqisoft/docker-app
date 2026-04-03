import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateName = useAuthStore((s) => s.updateName);
  const setAvatar = useAuthStore((s) => s.setAvatar);
  const avatarError = useAuthStore((s) => s.avatarError);
  const clearAvatarError = useAuthStore((s) => s.clearAvatarError);

  const [name, setName] = useState(user?.name ?? '');
  const [nameSaved, setNameSaved] = useState(false);
  const [namePending, setNamePending] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);

  useEffect(() => {
    if (user?.name !== undefined) setName(user.name);
  }, [user?.name]);

  async function onNameSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user || name.trim() === user.name) return;
    setNameError(null);
    setNameSaved(false);
    setNamePending(true);
    try {
      await updateName(name.trim());
      setNameSaved(true);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : '저장에 실패했습니다.');
    } finally {
      setNamePending(false);
    }
  }

  async function onAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    clearAvatarError();
    setAvatarPending(true);
    try {
      await setAvatar(file);
    } catch {
      /* 스토어 avatarError */
    } finally {
      setAvatarPending(false);
    }
  }

  if (!user) return null;

  return (
    <>
      <div className="mb-6">
        <Button variant="ghost" size="sm" className="gap-1 px-0" asChild>
          <Link to="/posts">← 게시판으로</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>
            이름과 프로필 사진을 변경할 수 있습니다. 이메일은 계정 식별용으로
            변경할 수 없습니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {avatarError ? (
            <Alert variant="destructive">
              <AlertTitle>이미지</AlertTitle>
              <AlertDescription>{avatarError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <div className="shrink-0">
              {user.profileImageUrl ? (
                <img
                  src={user.profileImageUrl}
                  alt=""
                  className="border-border size-28 rounded-full border object-cover"
                />
              ) : (
                <div
                  className="bg-primary/15 text-primary border-border flex size-28 items-center justify-center rounded-full border text-3xl font-medium"
                  aria-hidden
                >
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground text-sm">
                {user.profileImageUrl
                  ? '현재 이미지 URL: ' + user.profileImageUrl
                  : '등록된 프로필 이미지가 없습니다.'}
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs hover:bg-accent">
                <Camera className="size-4" aria-hidden />
                {avatarPending ? '업로드 중…' : '이미지 변경'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={avatarPending}
                  onChange={onAvatarChange}
                />
              </label>
              <p className="text-muted-foreground text-xs">
                JPEG, PNG, WebP, GIF · 최대 2MB
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>이메일</Label>
            <Input value={user.email} disabled readOnly className="bg-muted/50" />
          </div>

          <form className="space-y-4" onSubmit={onNameSubmit}>
            <div className="space-y-2">
              <Label htmlFor="profile-name">이름</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameSaved(false);
                }}
                maxLength={100}
                autoComplete="name"
              />
            </div>
            {nameError ? (
              <p className="text-destructive text-sm">{nameError}</p>
            ) : null}
            {nameSaved ? (
              <p className="text-muted-foreground text-sm">저장되었습니다.</p>
            ) : null}
            <Button
              type="submit"
              className="gap-2"
              disabled={namePending || name.trim() === user.name}
            >
              {namePending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  저장 중…
                </>
              ) : (
                '이름 저장'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
