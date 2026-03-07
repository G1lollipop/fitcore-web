import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-orange-500/20 via-transparent to-transparent" />
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-700/10 via-transparent to-transparent" />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md">
          <SignUp 
            appearance={{
              variables: {
                colorPrimary: '#f97316',
                colorText: 'white',
                colorTextOnPrimaryBackground: 'white',
                colorTextSecondary: '#a1a1aa',
                colorBackground: '#18181b',
                colorInputBackground: 'white',
                colorInputText: 'black',
                colorInputPlaceholder: '#666666',
                colorDanger: '#ef4444',
                colorSuccess: '#22c55e',
                colorWarning: '#eab308',
                borderRadius: '8px',
              },
              elements: {
                rootBox: 'w-full',
                card: {
                  backgroundColor: '#18181b',
                  boxShadow: '0 0 40px rgba(249, 115, 22, 0.2)',
                  border: '1px solid #3f3f46',
                },
                header: {
                  color: 'white',
                },
                headerTitle: {
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: 'bold',
                },
                headerSubtitle: {
                  color: '#a1a1aa',
                  fontSize: '14px',
                },
                socialButtonsBlockButton: {
                  backgroundColor: '#27272a',
                  borderColor: '#3f3f46',
                  color: 'white',
                },
                socialButtonsBlockButtonText: {
                  color: 'white',
                },
                formButtonPrimary: {
                  backgroundColor: '#f97316',
                  color: 'white',
                },
                formFieldLabel: {
                  color: 'white',
                  fontWeight: '500',
                },
                formFieldInput: {
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: '#d4d4d8',
                },
                formFieldInputShowPasswordButton: {
                  color: '#666',
                },
                footer: {
                  display: 'none',
                },
                footerAction: {
                  color: '#a1a1aa',
                },
                footerActionLink: {
                  color: '#f97316',
                },
                dividerLine: {
                  backgroundColor: '#3f3f46',
                },
                dividerText: {
                  color: '#71717a',
                },
                identityPreview: {
                  backgroundColor: '#27272a',
                  borderColor: '#3f3f46',
                },
                identityPreviewText: {
                  color: 'white',
                },
                identityPreviewEditButton: {
                  color: '#f97316',
                },
                formFieldInputCheckbox: {
                  color: '#f97316',
                },
                formFieldInputCheckboxCircle: {
                  color: '#f97316',
                },
                otpCodeFieldInput: {
                  backgroundColor: 'white',
                  color: 'black',
                  borderColor: '#d4d4d8',
                },
              },
            }}
            routing="path"
            path="/sign-up"
          />
        </div>
      </div>
    </div>
  )
}
