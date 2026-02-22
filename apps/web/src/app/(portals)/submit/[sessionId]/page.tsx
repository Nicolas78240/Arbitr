'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  PenLine,
  Clock,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const ACCEPTED_FILE_TYPES =
  '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg';

interface FormField {
  id: string;
  label: string;
  placeholder: string | null;
  type: 'TEXT' | 'TEXTAREA' | 'NUMBER' | 'SELECT' | 'EMAIL' | 'URL';
  required: boolean;
  options: string[];
  order: number;
}

interface SessionInfo {
  id: string;
  name: string;
  description: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED';
  labelProject: string;
  fields: FormField[];
}

interface Project {
  id: string;
  name: string;
  number: number;
  formData: Record<string, string>;
  fileUrl: string | null;
  fileName: string | null;
  submittedAt: string;
  team: { id: string; name: string };
}

interface UploadResponse {
  fileUrl: string;
  fileName: string;
}

export default function TeamSubmissionPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [projectName, setProjectName] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [isEditing, setIsEditing] = useState(false);

  // File upload state
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch session info with form fields
  const {
    data: sessionInfo,
    isLoading: isLoadingSession,
    error: sessionError,
  } = useQuery<SessionInfo>({
    queryKey: ['submit-info', sessionId],
    queryFn: () => api.get<SessionInfo>(`/sessions/${sessionId}/submit-info`),
    enabled: !!sessionId,
  });

  // Fetch existing project (if any)
  const {
    data: existingProject,
    isLoading: isLoadingProject,
    error: projectError,
  } = useQuery<Project>({
    queryKey: ['my-project'],
    queryFn: () => api.get<Project>('/projects/mine'),
    enabled: !!sessionId,
    retry: false,
  });

  const hasProject = !!existingProject && !(projectError as { statusCode?: number })?.statusCode;

  // Initialize form data when session info or existing project loads
  useEffect(() => {
    if (!sessionInfo) return;

    if (existingProject && !isEditing) {
      setProjectName(existingProject.name);
      setFileUrl(existingProject.fileUrl);
      setFileName(existingProject.fileName);
      const savedData = existingProject.formData || {};
      const merged: Record<string, string> = {};
      for (const field of sessionInfo.fields) {
        merged[field.id] = (savedData[field.id] as string) || '';
      }
      setFormData(merged);
    } else if (!existingProject && !hasProject) {
      // New submission: initialize empty form data
      const initialData: Record<string, string> = {};
      for (const field of sessionInfo.fields) {
        initialData[field.id] = '';
      }
      if (Object.keys(formData).length === 0) {
        setFormData(initialData);
      }
    }
  }, [sessionInfo, existingProject]);

  // File upload handler — uses fetch directly with FormData (bypasses api client JSON serialization)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setIsUploading(true);

    try {
      const { accessToken } = useAuthStore.getState();
      const formPayload = new FormData();
      formPayload.append('file', file);

      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: formPayload,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({
          message: response.statusText,
        }));
        throw new Error(err.message || 'Upload failed');
      }

      const data: UploadResponse = await response.json();
      setFileUrl(data.fileUrl);
      setFileName(data.fileName);
      toast.success(`File "${data.fileName}" uploaded successfully`);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to upload file';
      setUploadError(message);
      toast.error(message);
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveFile = () => {
    setFileUrl(null);
    setFileName(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Create project mutation
  const createMutation = useMutation({
    mutationFn: (data: {
      name: string;
      formData: Record<string, string>;
      fileUrl?: string;
      fileName?: string;
    }) => api.post<Project>('/projects', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-project'] });
      toast.success('Project submitted successfully!');
    },
    onError: (error: { error?: string; message?: string }) => {
      if (error.error === 'DUPLICATE_SUBMISSION') {
        toast.error('Your team has already submitted a project');
        queryClient.invalidateQueries({ queryKey: ['my-project'] });
      } else {
        toast.error(error.message || 'Failed to submit project');
      }
    },
  });

  // Update project mutation
  const updateMutation = useMutation({
    mutationFn: (data: {
      projectId: string;
      name: string;
      formData: Record<string, string>;
      fileUrl?: string | null;
      fileName?: string | null;
    }) =>
      api.patch<Project>(`/projects/${data.projectId}`, {
        name: data.name,
        formData: data.formData,
        fileUrl: data.fileUrl,
        fileName: data.fileName,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-project'] });
      setIsEditing(false);
      toast.success('Project updated successfully!');
    },
    onError: (error: { message?: string }) => {
      toast.error(error.message || 'Failed to update project');
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (existingProject) {
      updateMutation.mutate({
        projectId: existingProject.id,
        name: projectName,
        formData,
        fileUrl,
        fileName,
      });
    } else {
      createMutation.mutate({
        name: projectName,
        formData,
        ...(fileUrl ? { fileUrl, fileName: fileName || undefined } : {}),
      });
    }
  };

  const handleStartEditing = () => {
    if (existingProject && sessionInfo) {
      setProjectName(existingProject.name);
      setFileUrl(existingProject.fileUrl);
      setFileName(existingProject.fileName);
      const savedData = existingProject.formData || {};
      const merged: Record<string, string> = {};
      for (const field of sessionInfo.fields) {
        merged[field.id] = (savedData[field.id] as string) || '';
      }
      setFormData(merged);
      setIsEditing(true);
    }
  };

  const renderFormField = (field: FormField) => {
    const value = formData[field.id] || '';

    switch (field.type) {
      case 'TEXTAREA':
        return (
          <Textarea
            id={field.id}
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
            rows={4}
          />
        );

      case 'SELECT':
        return (
          <Select
            value={value}
            onValueChange={(v) => handleFieldChange(field.id, v)}
            required={field.required}
            disabled={isSubmitting}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'NUMBER':
        return (
          <Input
            id={field.id}
            type="number"
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
          />
        );

      case 'EMAIL':
        return (
          <Input
            id={field.id}
            type="email"
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
          />
        );

      case 'URL':
        return (
          <Input
            id={field.id}
            type="url"
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
          />
        );

      case 'TEXT':
      default:
        return (
          <Input
            id={field.id}
            type="text"
            placeholder={field.placeholder || ''}
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            required={field.required}
            disabled={isSubmitting}
          />
        );
    }
  };

  // Loading state
  if (isLoadingSession || isLoadingProject) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  // Session load error
  if (sessionError || !sessionInfo) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-3 py-6">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-center text-slate-600">
                Unable to load session information. Please check your access and
                try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session is CLOSED
  if (sessionInfo.status === 'CLOSED') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          {sessionInfo.labelProject} Submission
        </h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-3 py-6">
              <AlertCircle className="h-10 w-10 text-amber-400" />
              <p className="text-center text-slate-600">
                This session is closed. Submissions are no longer accepted.
              </p>
              {existingProject && (
                <div className="mt-4 w-full">
                  <ProjectSummaryCard
                    project={existingProject}
                    sessionInfo={sessionInfo}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session is DRAFT (not yet open)
  if (sessionInfo.status === 'DRAFT') {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">
          {sessionInfo.labelProject} Submission
        </h1>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-3 py-6">
              <Clock className="h-10 w-10 text-slate-400" />
              <p className="text-center text-slate-600">
                This session is not yet open for submissions. Please wait for the
                administrator to activate it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted and not editing — show summary
  if (existingProject && !isEditing) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              {sessionInfo.labelProject} Submission
            </h1>
            <p className="text-slate-600 mt-1">
              {sessionInfo.name}
              {user ? ` — ${user.name}` : ''}
            </p>
          </div>
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            Submitted
          </Badge>
        </div>

        <ProjectSummaryCard
          project={existingProject}
          sessionInfo={sessionInfo}
        />

        <div className="mt-4">
          <Button onClick={handleStartEditing} className="w-full">
            <PenLine className="h-4 w-4 mr-2" />
            Edit Submission
          </Button>
        </div>
      </div>
    );
  }

  // Submission form (new or editing)
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">
        {existingProject ? 'Edit' : 'Submit'} {sessionInfo.labelProject}
      </h1>
      <p className="text-slate-600 mb-6">
        {sessionInfo.name}
        {user ? ` — ${user.name}` : ''}
      </p>

      {sessionInfo.description && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <p className="text-sm text-slate-600">{sessionInfo.description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            {existingProject ? 'Update your submission' : 'New submission'}
          </CardTitle>
          {existingProject && (
            <CardDescription>
              You have already submitted a project. You can update it below.
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project name — always present */}
            <div className="space-y-2">
              <Label htmlFor="projectName">
                {sessionInfo.labelProject} Name *
              </Label>
              <Input
                id="projectName"
                type="text"
                placeholder={`Enter your ${sessionInfo.labelProject.toLowerCase()} name`}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Dynamic form fields from session configuration */}
            {sessionInfo.fields.map((field) => (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={field.id}>
                  {field.label}
                  {field.required && ' *'}
                </Label>
                {renderFormField(field)}
              </div>
            ))}

            {/* File upload field */}
            <div className="space-y-2">
              <Label htmlFor="fileUpload">Fichier joint (optionnel)</Label>
              {fileUrl && fileName ? (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      File uploaded successfully
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                    className="flex-shrink-0 text-slate-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    id="fileUpload"
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileSelect}
                    disabled={isSubmitting || isUploading}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-slate-500"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Choose a file...
                      </>
                    )}
                  </Button>
                  <p className="mt-1 text-xs text-slate-400">
                    PDF, Word, PowerPoint, Excel, or images. Max 10 MB.
                  </p>
                </div>
              )}
              {uploadError && (
                <p className="text-sm text-red-500">{uploadError}</p>
              )}
            </div>

            <div className="flex gap-3">
              {existingProject && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsEditing(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || isUploading || !projectName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {existingProject ? 'Updating...' : 'Submitting...'}
                  </>
                ) : existingProject ? (
                  'Update Submission'
                ) : (
                  'Submit Project'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Sub-component: Project summary card
function ProjectSummaryCard({
  project,
  sessionInfo,
}: {
  project: Project;
  sessionInfo: SessionInfo;
}) {
  const submittedDate = new Date(project.submittedAt).toLocaleDateString(
    'fr-FR',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{project.name}</CardTitle>
          <Badge variant="outline" className="text-slate-600">
            #{project.number}
          </Badge>
        </div>
        <CardDescription>
          Submitted on {submittedDate}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessionInfo.fields.length > 0 && (
          <div className="space-y-4">
            {sessionInfo.fields.map((field) => {
              const value = project.formData?.[field.id];
              if (!value) return null;

              return (
                <div key={field.id}>
                  <p className="text-sm font-medium text-slate-500">
                    {field.label}
                  </p>
                  <p className="text-sm text-slate-900 mt-0.5 whitespace-pre-wrap">
                    {String(value)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {sessionInfo.fields.length === 0 && (
          <p className="text-sm text-slate-500">
            No additional fields configuréd for this session.
          </p>
        )}

        {/* Attached file download link */}
        {project.fileUrl && project.fileName && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-sm font-medium text-slate-500 mb-2">
              Fichier joint
            </p>
            <a
              href={`${API_URL}${project.fileUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-md text-sm hover:bg-blue-100 transition-colors"
            >
              <FileText className="h-4 w-4" />
              {project.fileName}
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
