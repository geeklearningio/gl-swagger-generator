# Jane - An OpenAPI Specification (formerly Swagger) Client Generator

Jane is an [OpenAPI Specification](https://www.openapis.org/) client generator. 
It uses templates written in Handlebars to generate a client code base in various languages.

The initial release is focused on providing a strong support of C# .NET Standard 1.3 
and TypeScript. 

# Basic usage

To generate the API client, you need to give it two things:
- The *swagger json file* of your API, defining all the available methods.
- A *configuration json file*, specifying some options for your client generation.

A configuration file looks like this:
```json
{
  "language": "typescript",
  "framework": "angular",
  "version": "1.5",
  "mode": "singleFile",
  "dependencies": {
  },
  "mediaTypesPriorities": {
    "application/json": 1
  },
  "ambientTypes": [
  ],
  "templateOptions": {
    "clientName": "MyAPIClient"
    "scheme": {
      "override": "https"
    },
    "generateInterface": true
  }
}
```

To generate your API client, just run swaggen with these options:
```bash
swaggen --outputPath ./outputpath --options ./swaggen-config.json --schema ./api-swagger.json
```

## Languages available
You can generate the client in 2 languages for the moment. Here are the docs:
- [C# .NET Standard](https://github.com/geeklearningio/gl-swagger-generator/wiki/Csharp-Net-Standard)
- [TypeScript Angular 1.5](https://github.com/geeklearningio/gl-swagger-generator/wiki/Angular-1.5)

# Documentation

Documentation is maintained in this repository [wiki](https://github.com/geeklearningio/gl-swagger-generator/wiki)

# Integration

Jane will have a CLI interface but is meant to be integrated in build pipeline such as gulp. 
A gulp plugin acting as a wrapper for Jane is [already available](https://github.com/geeklearningio/gulp-swagger-generator/tree/develop).
Please check the [wiki](https://github.com/geeklearningio/gl-swagger-generator/wiki) for guidance.

# Extensibility

One purpose of this generator is to allow you to write or customize templates if needed. Please check the wiki for more information.

# The story behind this project

Read the [Jane's story](https://github.com/geeklearningio/gl-swagger-generator/wiki/Jane's-story)
