import { Button } from "./button"
import { ArrowRight } from "lucide-react"
import { useLogo } from "../../context/LogoContext"

const Navbar = ({ onSignIn }) => {
  const { logoSrc } = useLogo();
  
  return (
    <nav className="bg-secondary text-primary py-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <img src={logoSrc} alt="Logo" className="w-10 h-10" />
          <h1 className="text-2xl font-bold">SIMULIA</h1>
        </div>
        <Button variant="outline" onClick={onSignIn}>
          Acceso a plataforma <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </nav>
  )
}

export default Navbar

