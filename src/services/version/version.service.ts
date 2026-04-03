export class VersionService {
  constructor(private readonly projectVersion: string) {}

  getVersion(): string {
    return this.projectVersion;
  }
}
