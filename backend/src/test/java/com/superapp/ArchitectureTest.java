package com.superapp;

import org.springframework.web.bind.annotation.RestController;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.dependencies.SlicesRuleDefinition.slices;

/**
 * Guard rails for the feature-packaged monolith (no framework, just tests):
 * <ol>
 *   <li>A feature's {@code internal} package is private to that feature.</li>
 *   <li>The shared kernel never depends on a feature.</li>
 *   <li>Features never form dependency cycles.</li>
 * </ol>
 */
@AnalyzeClasses(packages = "com.superapp", importOptions = ImportOption.DoNotIncludeTests.class)
class ArchitectureTest {

    private static final String[] FEATURES = {"auth", "identity", "user", "admin"};

    @ArchTest
    static void internalPackagesArePrivateToTheirFeature(JavaClasses classes) {
        for (var feature : FEATURES) {
            noClasses()
                    .that().resideOutsideOfPackage("com.superapp." + feature + "..")
                    .should().dependOnClassesThat().resideInAPackage("com.superapp." + feature + ".internal..")
                    .because("only the top-level package of '" + feature + "' is its public API")
                    .check(classes);
        }
    }

    @ArchTest
    static final ArchRule sharedKernelDependsOnNoFeature = noClasses()
            .that().resideInAPackage("com.superapp.shared..")
            .should().dependOnClassesThat().resideInAnyPackage(
                    "com.superapp.auth..", "com.superapp.identity..", "com.superapp.user..", "com.superapp.admin..");

    @ArchTest
    static final ArchRule featuresAreFreeOfCycles = slices()
            .matching("com.superapp.(*)..")
            .should().beFreeOfCycles();

    @ArchTest
    static final ArchRule controllersStayInInternalPackages = noClasses()
            .that().areAnnotatedWith(RestController.class)
            .should().resideOutsideOfPackage("..internal..");
}
