Pod::Spec.new do |s|
  s.name           = 'AccompanyCalls'
  s.version        = '1.0.0'
  s.summary        = 'CallKit and Android call notification for Accompany'
  s.homepage       = 'https://github.com/accompany/app'
  s.license        = 'MIT'
  s.author         = 'Accompany'
  s.source         = { git: '' }
  s.platforms      = { ios: '15.1' }
  s.swift_version  = '5.9'
  s.source_files   = '**/*.{h,m,mm,swift}'
  s.dependency 'ExpoModulesCore'
  s.frameworks = 'CallKit'
end
