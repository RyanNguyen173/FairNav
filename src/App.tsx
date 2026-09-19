import { ThemeProvider } from './theme/ThemeContext'
import { WizardProvider, useWizard } from './wizard/WizardContext'
import { Step1ResumeUpload } from './steps/Step1ResumeUpload'
import { Step2ProfileEditor } from './steps/Step2ProfileEditor'
import { Step3FairIngestion } from './steps/Step3FairIngestion'
import { Step4CompanyMatcher } from './steps/Step4CompanyMatcher'
import { Step5CompanyBriefs } from './steps/Step5CompanyBriefs'
import { Step6FairModeHUD } from './steps/Step6FairModeHUD'

function WizardRouter() {
  const { state } = useWizard()

  if (state.fairMode.active || state.step === 6) return <Step6FairModeHUD />

  switch (state.step) {
    case 1:
      return <Step1ResumeUpload />
    case 2:
      return <Step2ProfileEditor />
    case 3:
      return <Step3FairIngestion />
    case 4:
      return <Step4CompanyMatcher />
    case 5:
      return <Step5CompanyBriefs />
    default:
      return <Step1ResumeUpload />
  }
}

function App() {
  return (
    <ThemeProvider>
      <WizardProvider>
        <WizardRouter />
      </WizardProvider>
    </ThemeProvider>
  )
}

export default App
