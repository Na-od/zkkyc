import { Shield } from "lucide-react";

const Footer = () => (
  <footer className="border-t border-border/50 py-12">
    <div className="container mx-auto px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Shield className="h-4 w-4 text-primary/60" />
          <span className="text-sm">
            zkCredential on Stellar — U2SSO Platform
          </span>
        </div>
        <div className="flex gap-6 text-xs text-muted-foreground">
          <a href="https://stellar.org" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
            Stellar
          </a>
          <a href="https://soroban.stellar.org" target="_blank" rel="noopener" className="hover:text-foreground transition-colors">
            Soroban
          </a>
          <span>Testnet</span>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
